<template>
  <div class="tabs-view">
    <Tabs
      :active-key="activeKey"
      hide-add
      type="editable-card"
      class="tabs"
      @change="changePage"
      @edit="editTabItem"
    >
      <Tabs.TabPane v-for="pageItem in tabsList" :key="pageItem.fullPath">
        <template #tab>
          <Dropdown :trigger="['contextmenu']">
            <div style="display: inline-block">
              <TitleI18n :title="pageItem.meta?.title" />
            </div>
            <template #overlay>
              <Menu style="user-select: none">
                <Menu.Item key="1" :disabled="activeKey !== pageItem.fullPath" @click="reloadPage">
                  <reload-outlined />
                  {{ $t('layout.multipleTab.reload') }}
                </Menu.Item>
                <Menu.Item key="2" @click="removeTab(pageItem)">
                  <close-outlined />
                  {{ $t('layout.multipleTab.close') }}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item key="3" @click="closeLeft(pageItem)">
                  <vertical-right-outlined />
                  {{ $t('layout.multipleTab.closeLeft') }}
                </Menu.Item>
                <Menu.Item key="4" @click="closeRight(pageItem)">
                  <vertical-left-outlined />
                  {{ $t('layout.multipleTab.closeRight') }}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item key="5" @click="closeOther(pageItem)">
                  <column-width-outlined />
                  {{ $t('layout.multipleTab.closeOther') }}
                </Menu.Item>
                <Menu.Item key="6" @click="closeAll">
                  <minus-outlined />
                  {{ $t('layout.multipleTab.closeAll') }}
                </Menu.Item>
              </Menu>
            </template>
          </Dropdown>
        </template>
      </Tabs.TabPane>

      <template #rightExtra>
        <Dropdown :trigger="['click']" placement="bottomRight">
          <a class="ant-dropdown-link" @click.prevent>
            <down-outlined :style="{ fontSize: '20px' }" />
          </a>
          <template #overlay>
            <Menu style="user-select: none">
              <Menu.Item key="1" :disabled="activeKey !== route.fullPath" @click="reloadPage">
                <reload-outlined />
                {{ $t('layout.multipleTab.reload') }}
              </Menu.Item>
              <Menu.Item key="2" @click="removeTab(route)">
                <close-outlined />
                {{ $t('layout.multipleTab.close') }}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item key="5" @click="closeOther(route)">
                <column-width-outlined />
                {{ $t('layout.multipleTab.closeOther') }}
              </Menu.Item>
              <Menu.Item key="6" @click="closeAll">
                <minus-outlined />
                {{ $t('layout.multipleTab.closeAll') }}
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>
      </template>
    </Tabs>
    <div class="tabs-view-content">
      <router-view v-slot="{ Component }">
        <template v-if="Component">
          <transition
            :name="Object.is(route.meta?.transitionName, false) ? '' : 'fade-transform'"
            mode="out-in"
            appear
          >
            <keep-alive :include="keepAliveComponents">
              <component :is="Component" :key="route.fullPath" />
            </keep-alive>
          </transition>
        </template>
      </router-view>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, unref, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import {
    DownOutlined,
    ReloadOutlined,
    CloseOutlined,
    VerticalRightOutlined,
    VerticalLeftOutlined,
    ColumnWidthOutlined,
    MinusOutlined,
  } from '@ant-design/icons-vue';
  import { Dropdown, Tabs, message, Menu } from 'ant-design-vue';
  import type { RouteLocation } from 'vue-router';
  import { Storage } from '@/utils/Storage';
  import { TABS_ROUTES } from '@/enums/cacheEnum';
  import { useTabsViewStore, blackList } from '@/store/modules/tabsView';
  import { useKeepAliveStore } from '@/store/modules/keepAlive';
  import { REDIRECT_NAME } from '@/router/constant';
  import { TitleI18n } from '@/components/basic/title-i18n';

  type RouteItem = Omit<RouteLocation, 'matched' | 'redirectedFrom'>;

  const route = useRoute();
  const router = useRouter();
  const tabsViewStore = useTabsViewStore();
  const keepAliveStore = useKeepAliveStore();

  const activeKey = computed(() => tabsViewStore.getCurrentTab?.fullPath);

  // ???????????????
  const tabsList = computed(() => tabsViewStore.getTabsList);

  // ???????????????????????????
  const keepAliveComponents = computed(() => keepAliveStore.list);

  // ???????????????????????????
  const getSimpleRoute = (route): RouteItem => {
    const { fullPath, hash, meta, name, params, path, query } = route;
    return { fullPath, hash, meta, name, params, path, query };
  };

  let routes: RouteItem[] = [];

  try {
    const routesStr = Storage.get(TABS_ROUTES) as string | null | undefined;
    routes = routesStr ? JSON.parse(routesStr) : [getSimpleRoute(route)];
  } catch (e) {
    routes = [getSimpleRoute(route)];
  }

  // ??????????????????
  tabsViewStore.initTabs(routes);

  // tabsViewMutations.initTabs(routes)

  watch(
    () => route.fullPath,
    () => {
      if (blackList.some((n) => n === route.name)) return;
      // tabsViewMutations.addTabs(getSimpleRoute(route))
      tabsViewStore.addTabs(getSimpleRoute(route));
    },
    { immediate: true },
  );

  // ?????????????????????????????????????????????
  window.addEventListener('beforeunload', () => {
    Storage.set(TABS_ROUTES, JSON.stringify(tabsList.value));
  });

  // ????????????????????????????????????
  const isCurrentRoute = (route) => {
    return router.currentRoute.value.matched.some((item) => item.name === route.name);
  };

  // ??????????????????
  const removeTab = (route) => {
    if (tabsList.value.length === 1) {
      return message.warning('????????????????????????????????????????????????');
    }
    // tabsViewMutations.closeCurrentTabs(route)
    tabsViewStore.closeCurrentTab(route);
  };
  // tabs ?????????remove || add???
  const editTabItem = (targetKey, action: string) => {
    if (action == 'remove') {
      removeTab(tabsList.value.find((item) => item.fullPath == targetKey));
    }
  };
  // ????????????
  const changePage = (key) => {
    Object.is(route.fullPath, key) || router.push(key);
  };

  // ????????????
  const reloadPage = () => {
    router.replace({
      name: REDIRECT_NAME,
      params: {
        path: unref(route).fullPath,
      },
    });
  };

  // ????????????
  const closeLeft = (route) => {
    // tabsViewMutations.closeLeftTabs(route)
    tabsViewStore.closeLeftTabs(route);
    !isCurrentRoute(route) && router.replace(route.fullPath);
  };

  // ????????????
  const closeRight = (route) => {
    // tabsViewMutations.closeRightTabs(route)
    tabsViewStore.closeRightTabs(route);
    !isCurrentRoute(route) && router.replace(route.fullPath);
  };

  // ????????????
  const closeOther = (route) => {
    // tabsViewMutations.closeOtherTabs(route)
    tabsViewStore.closeOtherTabs(route);
    !isCurrentRoute(route) && router.replace(route.fullPath);
  };

  // ????????????
  const closeAll = () => {
    localStorage.removeItem('routes');
    // tabsViewMutations.closeAllTabs()
    tabsViewStore.closeAllTabs();
    router.replace('/');
  };
</script>

<style lang="less" scoped>
  .dark .tabs-view {
    border-top: 1px solid black;
  }

  .tabs-view {
    border-top: 1px solid #eee;

    :deep(.tabs) {
      .ant-tabs-nav {
        @apply bg-white dark:bg-black;
        padding: 4px 20px 0 10px;
        margin: 0;
        user-select: none;
      }

      .ant-tabs-tabpane {
        display: none;
      }

      .ant-tabs-tab-remove {
        display: flex;
        padding: 0;
        margin: 0;

        .anticon-close {
          padding-left: 6px;
        }
      }

      .ant-tabs-tab:not(.ant-tabs-tab-active) {
        .ant-tabs-tab-remove {
          width: 0;
        }

        .anticon-close {
          width: 0;
          visibility: hidden;
          transition: width 0.3s;
        }

        &:hover {
          .anticon-close {
            width: 16px;
            visibility: visible;
            padding-left: 6px;
          }

          .ant-tabs-tab-remove {
            width: unset;
          }
        }
      }
    }

    .tabs-view-content {
      /* height: calc(100vh - #{$header-height}); */
      height: calc(100vh - 110px);
      padding: 20px 14px 0;
      overflow: auto;
    }
  }
</style>
