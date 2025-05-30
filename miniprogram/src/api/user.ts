import { http } from '@/utils/request'

interface LoginParams {
  code?: string;
  inviteCode?: string;
  [key: string]: any;
}

interface VipPaymentParams {
  amount: number;
}

// 用户相关接口
export const userApi = {
  // 登录
  login: (data = {}) => {
    return http.post('/user/login', data)
  },
  // 获取用户信息
  getUserInfo: () => {
    return http.get('/user/user-info')
  },
  // 获取邀请码
  getInviteCode: () => {
    return http.get('/user/invite-code')
  },
  // 获取佣金记录
  getCommissions: () => {
    return http.get('/user/commissions')
  },
  // 获取邀请好友列表
  getInvitees: () => {
    return http.get('/user/invitees')
  },
  // 核销邀请码
  redeemInviteCode: (inviteCode: string) => {
    return http.post('/user/redeem-invite-code', { inviteCode })
  },
  // 获取用户手机号
  getPhoneNumber: (code: string) => {
    return http.post('/user/phone-number', { code })
  },
  // 加入VIP
  joinVip: (amount: number) => {
    return http.post('/user/join-vip', { amount })
  },
  // 获取VIP状态
  getVipStatus: () => {
    return http.get('/user/vip-status')
  }
}