import axiosCookieJarSupport from 'axios-cookiejar-support';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as JSONBig from 'json-bigint';
import * as qs from 'qs';
import { CookieJar } from 'tough-cookie';

import { encryptWithXOR } from './cryptography';
import {
  BaseRequestParams,
  BaseResponseData,
  FollowRequest,
  FollowResponse,
  HashtagSearchResponse,
  JoinLiveStreamResponse,
  LikePostRequest,
  LikePostResponse,
  ListCategoriesRequest,
  ListCategoriesResponse,
  ListCommentsRequest,
  ListCommentsResponse,
  ListFeedRequest,
  ListFeedResponse,
  ListFollowersRequest,
  ListFollowersResponse,
  ListFollowingRequest,
  ListFollowingResponse,
  ListForYouFeedResponse,
  ListPostsRequest,
  ListPostsResponse,
  LiveStreamRequest,
  LoginRequest,
  LoginResponse,
  PostCommentRequest,
  PostCommentResponse,
  RequiredUserDefinedRequestParams,
  SearchRequest,
  StaticRequestParams,
  Tag,
  TikTokAPIConfig,
  UserProfileResponse,
  UserSearchRequest,
  UserSearchResponse,
} from './types';
import { FeedType, PullType } from './feed';
import { paramsOrder, paramsSerializer, withDefaultListParams } from './params';

export default class TikTokAPI {
  readonly config: TikTokAPIConfig;
  readonly cookieJar: CookieJar;
  readonly request: AxiosInstance;

  /**
   * Creates a new API instance.
   *
   * @param {StaticRequestParams} requestParams
   * @param {TikTokAPIConfig} apiConfig
   * @param {AxiosRequestConfig} requestConfig
   */
  constructor(requestParams: StaticRequestParams, apiConfig: TikTokAPIConfig, requestConfig?: AxiosRequestConfig) {
    if (typeof apiConfig.signURL !== 'function') {
      throw new Error('You must supply a signURL function to the TikTokAPI config');
    }

    this.config = {
      baseURL: 'https://api2.musical.ly/',
      host: 'api2.musical.ly',
      userAgent: `com.zhiliaoapp.musically/${requestParams.manifest_version_code}`
        + ` (Linux; U; Android ${requestParams.os_version}; ${requestParams.language}_${requestParams.region};`
        + ` ${requestParams.device_type}; Build/NHG47Q; Cronet/58.0.2991.0)`,
      ...apiConfig,
    } as TikTokAPIConfig;

    this.cookieJar = new CookieJar();
    this.request = axios.create({
      paramsSerializer: paramsSerializer(paramsOrder),
      baseURL: this.config.baseURL,
      headers: {
        host: this.config.host,
        connection: 'keep-alive',
        'accept-encoding': 'gzip',
        'user-agent': this.config.userAgent,
      },
      jar: this.cookieJar,
      params: requestParams,
      transformResponse: this.transformResponse,
      withCredentials: true,
      ...requestConfig,
    } as AxiosRequestConfig);
    axiosCookieJarSupport(this.request);

    this.request.interceptors.request.use(this.signRequest);
  }

  /**
   * Logs into musical.ly using an email and password.
   *
   * @param {string} email
   * @param {string} password
   * @returns {AxiosPromise}
   */
  loginWithEmail = (email: string, password: string) => this.login({
    mix_mode: 1,
    username: '',
    email: encryptWithXOR(email),
    mobile: '',
    account: '',
    password: encryptWithXOR(password),
    captcha: '',
    app_type: 'normal',
  })

  /**
   * Logs into musical.ly.
   *
   * @param {LoginRequest} params
   * @returns {AxiosPromise<LoginResponse>}
   */
  login = (params: LoginRequest) =>
    this.request.post<LoginResponse>('passport/user/login/', null, { params })

  /**
   * Gets a user's profile.
   *
   * @param {string} userId
   * @returns {AxiosPromise<UserProfileResponse>}
   */
  getUser = (userId: string) =>
    this.request.get<UserProfileResponse | BaseResponseData>('aweme/v1/user/', { params: { user_id: userId } })

  /**
   * Searches for users.
   *
   * @param params
   * @returns {AxiosPromise<UserSearchResponse | BaseResponseData>}
   */
  searchUsers = (params: UserSearchRequest) =>
    this.request.get<UserSearchResponse | BaseResponseData>('aweme/v1/discover/search/', {
      params: withDefaultListParams(params),
    })

  /**
   * Lists a user's posts.
   *
   * @param {ListPostsRequest} params
   * @returns {AxiosPromise<ListPostsResponse | BaseResponseData>}
   */
  listPosts = (params: ListPostsRequest) =>
    this.request.get<ListPostsResponse | BaseResponseData>('aweme/v1/aweme/post/', {
      params: withDefaultListParams(params),
    })

  /**
   * Lists a user's followers.
   *
   * @param {ListFollowersRequest} params
   * @returns {AxiosPromise<ListFollowersResponse | BaseResponseData>}
   */
  listFollowers = (params: ListFollowersRequest) =>
    this.request.get<ListFollowersResponse | BaseResponseData>('aweme/v1/user/follower/list/', {
      params: withDefaultListParams(params),
    })

  /**
   * Lists the users a user is following.
   *
   * @param {ListFollowingRequest} params
   * @returns {AxiosPromise<ListFollowingResponse | BaseResponseData>}
   */
  listFollowing = (params: ListFollowingRequest) =>
    this.request.get<ListFollowingResponse | BaseResponseData>('aweme/v1/user/following/list/', {
      params: withDefaultListParams(params),
    })

  /**
   * Follows a user.
   *
   * @param userId
   * @returns {AxiosPromise<FollowResponse | BaseResponseData>}
   */
  follow = (userId: string) =>
    this.request.get<FollowResponse | BaseResponseData>('aweme/v1/commit/follow/user/', {
      params: <FollowRequest>{
        user_id: userId,
        type: 1,
      },
    })

  /**
   * Unfollows a user.
   *
   * @param userId
   * @returns {AxiosPromise<FollowResponse | BaseResponseData>}
   */
  unfollow = (userId: string) =>
    this.request.get<FollowResponse | BaseResponseData>('aweme/v1/commit/follow/user/', {
      params: <FollowRequest>{
        user_id: userId,
        type: 0,
      },
    })

  /**
   * Likes a post.
   *
   * @param postId
   * @returns {AxiosPromise<LikePostResponse | BaseResponseData>}
   */
  likePost = (postId: string) =>
    this.request.get<LikePostResponse | BaseResponseData>('aweme/v1/commit/item/digg/', {
      params: <LikePostRequest>{
        aweme_id: postId,
        type: 1,
      },
    })

  /**
   * Unlikes a post.
   *
   * @param postId
   * @returns {AxiosPromise<LikePostResponse | BaseResponseData>}
   */
  unlikePost = (postId: string) =>
    this.request.get<LikePostResponse | BaseResponseData>('aweme/v1/commit/item/digg/', {
      params: <LikePostRequest>{
        aweme_id: postId,
        type: 0,
      },
    })

  /**
   * Lists comments for a post.
   *
   * @param params
   */
  listComments = (params: ListCommentsRequest) =>
    this.request.get<ListCommentsResponse | BaseResponseData>('aweme/v1/comment/list/', {
      params: withDefaultListParams(<ListCommentsRequest>{
        comment_style: 2,
        digged_cid: '',
        insert_cids: '',
        ...params,
      }),
    })

  /**
   * Posts a comment on a post.
   *
   * @param postId
   * @param text
   * @param tags
   */
  postComment = (postId: string, text: string, tags: Tag[] = []) =>
    this.request.post<PostCommentResponse | BaseResponseData>(
      'aweme/v1/comment/publish/',
      qs.stringify(<PostCommentRequest>{
        text,
        aweme_id: postId,
        text_extra: tags,
        is_self_see: 0,
      }),
      {
        headers: {
          'content-type': 'application.x-www-form-urlencoded',
        },
      },
    )

  /**
   * Lists popular categories/hashtags.
   *
   * @param params
   */
  listCategories = (params: ListCategoriesRequest = { count: 10, cursor: 0 }) =>
    this.request.get<ListCategoriesResponse | BaseResponseData>('aweme/v1/category/list/', {
      params: withDefaultListParams(params),
    })

  /**
   * Searches for hashtags.
   *
   * @param params
   * @returns {AxiosPromise<HashtagSearchResponse | BaseResponseData>}
   */
  searchHashtags = (params: SearchRequest) =>
    this.request.get<HashtagSearchResponse | BaseResponseData>('aweme/v1/challenge/search/', {
      params: withDefaultListParams(params),
    })

  /**
   * Lists posts in the For You feed.
   *
   * max_cursor should always be 0.
   *
   * @param params
   */
  listForYouFeed = (params?: ListFeedRequest) =>
    this.request.get<ListForYouFeedResponse | BaseResponseData>('aweme/v1/feed/', {
      params: withDefaultListParams(<ListFeedRequest>{
        count: 6,
        is_cold_start: 1,
        max_cursor: 0,
        pull_type: PullType.LoadMore,
        type: FeedType.ForYou,
        ...params,
      }),
    })

  /**
   * Lists posts in the Following feed.
   *
   * max_cursor should always be 0.
   *
   * @param params
   */
  listFollowingFeed = (params?: ListFeedRequest) =>
    this.request.get<ListFeedResponse | BaseResponseData>('aweme/v1/feed/', {
      params: withDefaultListParams(<ListFeedRequest>{
        count: 6,
        is_cold_start: 1,
        max_cursor: 0,
        pull_type: PullType.LoadMore,
        type: FeedType.Following,
        ...params,
      }),
    })

  /**
   * Joins a live stream.
   *
   * @param id
   */
  joinLiveStream = (id: string) =>
    this.request.get<JoinLiveStreamResponse | BaseResponseData>('aweme/v1/room/enter/', {
      params: <LiveStreamRequest>{
        room_id: id,
      },
    })

  /**
   * Leaves a live stream.
   *
   * @param id
   */
  leaveLiveStream = (id: string) =>
    this.request.get<BaseResponseData>('aweme/v1/room/leave/', {
      params: <LiveStreamRequest>{
        room_id: id,
      },
    })

  /**
   * Transform using JSONBig to store big numbers accurately (e.g. user IDs) as strings.
   *
   * @param {any} data
   * @returns {any}
   */
  transformResponse = (data: any) => {
    if (!data || !data.length) {
      return data;
    }
    return JSONBig({ storeAsString: true }).parse(data);
  }

  /**
   * Adds timestamps and calls out to an external method to sign the URL.
   *
   * @param {AxiosRequestConfig} config
   * @returns {Promise<AxiosRequestConfig>}
   */
  private signRequest = async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
    if (typeof config.paramsSerializer !== 'function') {
      throw new Error('Missing required paramsSerializer function');
    }

    const ts = Math.floor((new Date()).getTime() / 1000);
    const params = {
      ...config.params,
      ts,
      _rticket: new Date().getTime(),
    } as BaseRequestParams;

    const url = `${config.baseURL}${config.url}?${config.paramsSerializer(params)}`;
    const signedURL = await this.config.signURL(url, ts, this.request.defaults.params.device_id);

    return {
      ...config,
      url: signedURL,
      params: {},
    };
  }
}

/**
 * Merges required user-defined parameters with default parameters.
 *
 * @param {RequiredUserDefinedRequestParams} requestParams
 * @returns {StaticRequestParams}
 */
export const getRequestParams = (requestParams: RequiredUserDefinedRequestParams): StaticRequestParams => ({
  os_api: '23',
  device_type: 'Pixel',
  ssmix: 'a',
  manifest_version_code: '2018080704',
  dpi: 420,
  app_name: 'normal',
  version_name: '8.1.0',
  timezone_offset: 37800,
  is_my_cn: 0,
  ac: 'wifi',
  update_version_code: '2018080704',
  channel: 'googleplay',
  device_platform: 'android',
  build_number: '8.1.0',
  version_code: 810,
  timezone_name: 'Australia/Lord_Howe',
  resolution: '1080*1920',
  os_version: '7.1.2',
  device_brand: 'Google',
  mcc_mnc: '',
  app_language: 'en',
  language: 'en',
  region: 'US',
  sys_region: 'US',
  carrier_region: 'AU',
  aid: '1233',
  ...requestParams,
});

export * from './types';
