import { http } from '@/utils/request';

// 公告API
export const announcementApi = {
  /**
   * 获取公告列表
   */
  getAnnouncements: (params) => {
    return http.get('/announcements', params);
  },

  /**
   * 获取公告详情
   */
  getAnnouncementDetail: (id) => {
    return http.get(`/announcements/${id}`);
  },

  /**
   * 获取最新公告
   */
  getLatestAnnouncement: () => {
    return http.get('/announcements/latest');
  },

  /**
   * 增加公告浏览次数
   */
  incrementViewCount: (id) => {
    return http.post(`/announcements/${id}/view`);
  }
}; 