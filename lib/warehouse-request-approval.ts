export const PENDING_ADMIN_APPROVAL_MESSAGE = 'This request is pending for admin approval.'

export function isPendingAdminApproval(request: { source: string; status: string }) {
  return (request.source === 'INTERNAL_SALES' || request.source === 'TECHNICIAN') &&
    (request.status === 'PENDING' || request.status === 'UNDER_REVIEW')
}
