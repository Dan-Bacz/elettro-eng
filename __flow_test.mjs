import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
const base = 'http://localhost:3055'
const SECRET = process.env.JWT_SECRET || 'dev-secret'

const results = []
function check(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  -> ' + extra : ''))
}

const hdrs = (token) => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token })

async function api(token, path, body) {
  const res = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: hdrs(token),
    body: body ? JSON.stringify(body) : undefined,
  })
  let data = null
  try { data = await res.json() } catch {}
  return { status: res.status, ok: res.ok, data }
}

const mk = (role, name, email) => prisma.user.create({ data: { name, email, role, password: null, status: 'ACTIVE' } })

const created = { users: [], bookings: [] }
try {
  const now = Date.now()
  const admin = await mk('ADMIN', 'Flow Admin ' + now, 'flow-admin-' + now + '@elettro.local')
  const t1 = await mk('TECH', 'Flow Tech 1 ' + now, 'flow-tech1-' + now + '@elettro.local')
  const t2 = await mk('TECH', 'Flow Tech 2 ' + now, 'flow-tech2-' + now + '@elettro.local')
  const client = await mk('CLIENT', 'Flow Client ' + now, 'flow-client-' + now + '@elettro.local')
  created.users = [admin.id, t1.id, t2.id, client.id]

  const adminTok = jwt.sign({ userId: admin.id, role: 'ADMIN' }, SECRET)
  const t1Tok = jwt.sign({ userId: t1.id, role: 'TECH' }, SECRET)
  const t2Tok = jwt.sign({ userId: t2.id, role: 'TECH' }, SECRET)

  const mkBooking = (title, status = 'PENDING') => prisma.booking.create({
    data: { clientId: client.id, title, status, description: 'auto flow test' },
  })

  // ---------- booking A: approve -> project -> team -> lock -> report ----------
  const a = await mkBooking('Flow Test Project A ' + now)
  created.bookings.push(a.id)

  let r = await api(adminTok, '/api/admin', { action: 'approve', bookingId: a.id })
  check('approve converts booking to APPROVED', r.status === 200 && r.data?.status === 'APPROVED', 'status=' + r.data?.status)

  r = await api(adminTok, '/api/admin', { action: 'approve', bookingId: a.id, status: 'APPROVED' })
  check('re-approve is idempotent (project already exists)', r.status === 200, 'status=' + r.status)

  let br = await api(adminTok, '/api/bookings/' + a.id)
  check('bookings/[id] includes project (APPROVED)', br.data?.project && br.data.project.status === 'APPROVED', JSON.stringify(br.data?.project?.status))

  let db = await api(adminTok, '/api/dashboard')
  const hasProjA = (db.data?.projects || []).some(p => p.bookingId === a.id)
  check('dashboard exposes projects array with booking A', hasProjA)

  r = await api(adminTok, '/api/admin', { action: 'assign', bookingId: a.id, assignToId: t1.id })
  check('assign -> ASSIGNED + project team = 1', r.status === 200 && r.data?.status === 'ASSIGNED', 'status=' + r.data?.status)

  br = await api(adminTok, '/api/bookings/' + a.id)
  const team1 = br.data?.project?.assignments || []
  check('assignment row created for lead tech', team1.length === 1 && team1[0].techId === t1.id, 'count=' + team1.length)

  r = await api(adminTok, '/api/admin', { action: 'add_technician', bookingId: a.id, assignToId: t2.id })
  check('add_technician -> 200', r.status === 200)

  br = await api(adminTok, '/api/bookings/' + a.id)
  const team2 = br.data?.project?.assignments || []
  check('project team now has 2 members', team2.length === 2, 'count=' + team2.length)

  r = await api(adminTok, '/api/admin', { action: 'update_status', bookingId: a.id, status: 'IN_PROGRESS' })
  check('ADMIN status change is LOCKED once team assigned (403)', r.status === 403, 'status=' + r.status + ' ' + (r.data?.error || ''))

  r = await api(t2Tok, '/api/admin', { action: 'add_technician', bookingId: a.id, assignToId: t1.id })
  check('TECH cannot add_technician (403)', r.status === 403, 'status=' + r.status)

  r = await api(t1Tok, '/api/admin', { action: 'update_status', bookingId: a.id, status: 'IN_PROGRESS' })
  check('TECH lead sets IN_PROGRESS', r.status === 200 && r.data?.status === 'IN_PROGRESS', 'status=' + r.data?.status)

  db = await api(adminTok, '/api/dashboard')
  const projA = (db.data?.projects || []).find(p => p.bookingId === a.id)
  check('project status synced to IN_PROGRESS', projA?.status === 'IN_PROGRESS', 'projStatus=' + projA?.status)

  r = await api(t2Tok, '/api/admin', { action: 'update_status', bookingId: a.id, status: 'COMPLETED' })
  check('TECH team member sets COMPLETED', r.status === 200 && r.data?.status === 'COMPLETED', 'status=' + r.data?.status)

  r = await api(adminTok, '/api/admin', { action: 'update_status', bookingId: a.id, status: 'IN_PROGRESS' })
  check('ADMIN regression to IN_PROGRESS is LOCKED (403)', r.status === 403, 'status=' + r.status)

  const techRes = await api(t2Tok, '/api/tech?techId=' + t2.id)
  const memberJob = (techRes.data?.bookings || []).some(b => b.id === a.id)
  check('technician dashboard lists job via project membership', memberJob)

  r = await api(adminTok, '/api/admin', { action: 'decline', bookingId: a.id })
  check('decline blocked when team assigned (400)', r.status === 400, 'status=' + r.status + ' ' + (r.data?.error || ''))

  r = await api(adminTok, '/api/admin', { action: 'delete_booking', bookingId: a.id })
  check('delete_booking removes project', r.ok && r.status === 200)

  br = await api(adminTok, '/api/bookings/' + a.id)
  check('booking A gone after delete', br.status === 404 || br.data?.id === undefined)

  // ---------- booking B: decline path ----------
  const b = await mkBooking('Flow Test Decline B ' + now)
  created.bookings.push(b.id)

  r = await api(adminTok, '/api/admin', { action: 'approve', bookingId: b.id })
  check('decline flow: approve B', r.status === 200 && r.data?.status === 'APPROVED', 'status=' + r.data?.status)

  r = await api(adminTok, '/api/admin', { action: 'decline', bookingId: b.id })
  check('decline approved booking with no team -> CANCELLED', r.status === 200 && r.data?.status === 'CANCELLED', 'status=' + r.data?.status)

  br = await api(adminTok, '/api/bookings/' + b.id)
  check('project synced to CANCELLED', br.data?.project?.status === 'CANCELLED', 'projStatus=' + br.data?.project?.status)

  r = await api(adminTok, '/api/admin', { action: 'delete_booking', bookingId: b.id })
  check('delete_booking B', r.ok && r.status === 200)

  r = await api(adminTok, '/api/admin', { action: 'decline', bookingId: b.id })
  check('decline of nonexistent booking -> 404', r.status === 404, 'status=' + r.status)
} catch (e) {
  console.log('EXCEPTION: ' + (e && e.stack || e))
} finally {
  // cleanup
  try {
    await prisma.technicianActivity.deleteMany({ where: { bookingId: { in: created.bookings } } })
    await prisma.report.deleteMany({ where: { bookingId: { in: created.bookings } } })
    await prisma.project.deleteMany({ where: { bookingId: { in: created.bookings } } })
    await prisma.booking.deleteMany({ where: { id: { in: created.bookings } } })
    await prisma.notification.deleteMany({ where: { userId: { in: created.users } } })
    await prisma.user.deleteMany({ where: { id: { in: created.users } } })
    console.log('cleanup done')
  } catch (e) {
    console.log('CLEANUP ERROR: ' + (e && e.message || e))
  }
  await prisma.$disconnect()
}

const failures = results.filter(r => !r.ok)
console.log('\n=== ' + results.length + ' checks, ' + failures.length + ' failures ===')
process.exit(failures.length ? 1 : 0)