import { defineStore } from 'pinia';
import { useWsStore } from './ws';
import type { RouteRecordRaw } from 'vue-router';
import { store } from '@/store';
import { login } from '@/api/login';
import { ACCESS_TOKEN_KEY, USER_CODE } from '@/enums/cacheEnum';
import { Storage } from '@/utils/Storage';
import { logout, getInfo, permmenu } from '@/api/account';
import { generatorDynamicRouter } from '@/router/generator-router';
import { resetRouter } from '@/router';

interface UserState {
  token: string;
  userCode: string;
  name: string;
  avatar: string;
  // like [ 'sys:user:add', 'sys:user:update' ]
  perms: string[];
  menus: RouteRecordRaw[];
  userInfo: Partial<API.AdminUserInfo>;
}

export const useUserStore = defineStore({
  id: 'user',
  state: (): UserState => ({
    token: Storage.get(ACCESS_TOKEN_KEY, null),
    userCode: Storage.get(USER_CODE, null),
    name: 'amdin',
    avatar: '',
    perms: [],
    menus: [],
    userInfo: {},
  }),
  getters: {
    getToken(): string {
      return this.token;
    },
    getAvatar(): string {
      return this.avatar;
    },
    getName(): string {
      return this.name;
    },
    getPerms(): string[] {
      return this.perms;
    },
    getUserCode(): string {
      return this.userCode;
    },
  },
  actions: {
    /** 清空token及用户信息 */
    resetToken() {
      this.avatar = this.token = this.userCode = this.name = '';
      this.perms = [];
      this.menus = [];
      this.userInfo = {};
      Storage.clear();
    },
    /** 登录成功保存token */
    setToken(token: string) {
      this.token = token ?? '';
      const ex = 7 * 24 * 60 * 60 * 1000;
      Storage.set(ACCESS_TOKEN_KEY, this.token, ex);
    },
    /** 登录成功后保存user_code*/
    setUserCode(userCode: string) {
      this.userCode = userCode ?? '';
      Storage.set(USER_CODE, this.userCode);
    },
    /** 登录 */
    async login(params: API.LoginParams) {
      try {
        const { data } = await login(params);
        this.setToken(data.token);
        this.setUserCode(data.user_code);
        return this.afterLogin();
      } catch (error) {
        return Promise.reject(error);
      }
    },
    /** 登录成功之后, 获取用户信息以及生成权限路由 */
    async afterLogin() {
      try {
        const wsStore = useWsStore();
        const [userInfo, { perms, menus }] = await Promise.all([getInfo(), permmenu()]);
        console.log(userInfo);
        this.perms = perms;
        this.name = userInfo.username;
        this.avatar = userInfo.headImg;
        this.userCode = userInfo.userCode;
        this.userInfo = userInfo;
        // 生成路由
        const generatorResult = await generatorDynamicRouter(menus);
        this.menus = generatorResult.menus.filter((item) => !item.meta?.hideInMenu);
        !wsStore.client && wsStore.initSocket();

        return { menus, perms, userInfo };
      } catch (error) {
        return Promise.reject(error);
        // return this.logout();
      }
    },
    /** 登出 */
    async logout() {
      await logout();
      const wsStore = useWsStore();
      wsStore.closeSocket();
      this.resetToken();
      resetRouter();
    },
  },
});

// 在组件setup函数外使用
export function useUserStoreWithOut() {
  return useUserStore(store);
}
