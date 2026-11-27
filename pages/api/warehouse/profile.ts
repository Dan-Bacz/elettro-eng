import { staffProfileHandler } from '../../../lib/staff-profile-handler'

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } }

export default staffProfileHandler('WAREHOUSE')
