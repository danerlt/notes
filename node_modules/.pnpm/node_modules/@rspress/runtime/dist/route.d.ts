import type { Route } from '@rspress/shared';
export declare function normalizeRoutePath(routePath: string): string;
/**
 * this is a bridge of two core features Sidebar and RouteService
 * @param pathname useLocation().pathname
 * @returns
 */
export declare function pathnameToRouteService(pathname: string): Route | undefined;
