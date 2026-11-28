import { accountProfileHandler } from '../../../lib/account-profile-handler'

export const config = { api: { bodyParser: { sizeLimit: '3mb' } } }

export default accountProfileHandler('SALES')
