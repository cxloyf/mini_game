/**
 * since BaiduClient 1.9
 * @author zhangyu24@baidu.com
 */
(function (window, document, undefined) {

    /**
     * jssdk 使用 **bdc** 作为 namespace
     */
    var bdc = window.bdc || (window.bdc = {});

    //平台通用api
    var HUB_API = 'lapuda_api_hub_v2';

    var JSSDK_VERSION = '2.0.0';

    var LOGIN_URL = 'http://cdn.api.mb.baidu.com/api_res/apps/login/login-v2.html';

    var NO_ERROR = 0;

    bdc.version = JSSDK_VERSION;

    var each = (function () {
        //if (Array.prototype.forEach) {
        //    return function (aList, fCallback) {
        //        aList.forEach(fCallback);
        //    }
        //} else {
        return function (aList, fCallback) {
            for (var i = 0; i < aList.length; i++) {
                if (fCallback.call(aList[i], aList[i], i, aList) === false) {
                    break;
                }
            }
        };
        //}
    }());

    //获取type
    var type = function (o) {
        return Object.prototype.toString.call(o).match(/(\w+)\]/)[1].toLowerCase();
    };

    //空函数
    var noop = function () {
    };

    var extend = function (obj) {
        obj = obj || {};
        var aArgs = [].slice.call(arguments, 1);
        var oCurrent;
        for (var i = 0, l = aArgs.length; i < l; i++) {
            oCurrent = aArgs[i];
            for (var p in oCurrent) {
                obj[p] = oCurrent[p];
            }
        }
        return obj;
    };

    //序列化对象为查询字符串
    var param = function (oParams, sKey) {

        var sResult = '';
        var aTemp = [];
        var sParamType = type(oParams);
        var encode = encodeURIComponent;

        do {
            if (sParamType == 'array') {
                if (sKey) {
                    sKey += '[]';
                }
                each(oParams, function (sItem) {
                    aTemp.push(param(sItem, sKey));
                });
                sResult = aTemp.join('&');
                break;
            }

            if (sParamType == 'object') {
                for (var sProp in oParams) {
                    aTemp.push(param(oParams[sProp], sProp));
                }
                sResult = aTemp.join('&');
                break;
            }

            sResult = encode(sKey) + '=' + encode(String(oParams));
        } while (false);

        return sResult;
    }

    //绑定dom的listener
    var addListener = function (oTarget, sType, fListener) {
        if (oTarget.addEventListener) {
            oTarget.addEventListener(sType, fListener, false);
        } else if (oTarget.attachEvent) {
            oTarget.attachEvent('on' + sType, fListener);
        } else {
            oTarget['on' + sType] = fListener;
        }
    };

    var Callbacks = function () {
        this._list = [];
    };
    Callbacks.prototype = {
        add   : function (fn) {
            if (!this.exist(fn)) {
                this._list.push(fn);
            }
            return this;
        },
        exist : function (fn) {
            var bResult = false;
            this.each(function (fCurrentFn) {
                if (fCurrentFn === fn) {
                    bResult = true;
                    return false;
                }
            });
            return bResult;
        },
        remove: function (fn) {
            var _this = this;
            this.each(function (fCurrentFn, nIndex) {
                if (fCurrentFn === fn) {
                    _this.splice(nIndex, 1);
                    return false;
                }
            });
            return this;
        },
        each  : function (fCallback) {
            var aCopy = this._list.concat();
            each(aCopy, fCallback);
            return this;
        },
        clear : function () {
            this._list = [];
        },
        fire  : function (oArgs, oContext) {
            if ({}.toString.call(oArgs) !== '[object Array]') {
                oArgs = [oArgs];
            }
            this.each(function (fCurrentFn) {
                return fCurrentFn.apply(oContext, oArgs);
            });
        }
    };

    /**
     * @class Observer
     * @ignore
     */
    var Observer = function () {
        this._events = {};
    };

    Observer.prototype = {
        /**
         * 绑定事件监听
         * @member Observer
         * @param {String} sEventType 事件类型
         * @param {Function} fHandler 事件处理函数
         */
        on: function (sEventType, fHandler) {
            if (!this._events[sEventType]) {
                this._events[sEventType] = new Callbacks();
            }
            this._events[sEventType].add(fHandler);
        },

        /**
         * 移除事件监听
         * @member Observer
         * @param {String} sEventType 事件类型
         * @param {Function} fHandler 事件处理函数
         */
        removeListener: function (sEventType, fHandler) {
            var oEvents = this._events[sEventType];
            if (oEvents) {
                oEvents.remove(fHandler);
            }
        },

        /**
         * 触发事件
         * @member Observer
         * @param {String} sEventType  触发的事件类型
         * @param {Array|Object} oArgs 事件参数
         * @param {Object} [oContext]  触发事件的上下文对象
         */
        fire: function (sEventType, oArgs, oContext) {
            var oEvents = this._events[sEventType];
            if (oEvents) {
                oEvents.fire(oArgs, oContext);
            }
        }
    };

    /**
     * 检测接口是否被当前版本的客户端所支持
     *
     *      bdc.support('local/basic/hide',function(oData){
     *          console.log(oData);
     *      })
     *
     *      返回
     *      {
     *          "error" : 0,
     *          "msg" : "",
     *          "body" : [
     *              { "local/basic/hide":{"exist":true, "version":1} }
     *          ]
     *      }
     *
     * @member bdc
     * @param {String|Array} aApi 参数列表, 可以传递一个或者一组
     * @param {Function} fCallback 回调, 返回的结果总是数组
     * @param {Boolean} fCallback.bResult 是否支持
     * @param {Number} fCallback.error  错误码，0 表示正常
     * @param {String} fCallback.msg  操作结果
     * @param {Object} fCallback.body 返回的结果数据
     * @param {Object} fCallback.body 返回的结果数据
     */
    bdc.support = function (aApi, fCallback) {

        var sArgType = type(aApi);

        if (sArgType == 'string') {
            aApi = [aApi];
        } else if (sArgType != 'array') {
            throw 'bdc.support() parameter must be a string or an array';
        }

        bdc.external.appSend(
            'local/basic/check_api_exist',
            aApi,
            fCallback
        );
    };

    bdc.toString = function () {
        return JSSDK_VERSION;
    };

    bdc.external = extend(bdc.external, (function () {
        var sDispatchEventName = '_BDC_CALLBACK_' + (Math.random() + '').slice(2);

        var oExternalEvents = {}
        window[sDispatchEventName] = function (nReqId, sResponse) {
            var fCallback = oExternalEvents[nReqId];
            if (fCallback) {
                fCallback(fResponseDataHandler(sResponse || ''));
            }
            return nReqId;
        }

        var fResponseDataHandler = function (sData) {
            var oData = {
                error: -999999,
                msg  : 'response data cannot be serialized as an object',
                body : {
                    origin: sData
                }
            };
            try {
                oData = JSON.parse(sData);
            } catch (e) {
            }

            return oData;
        }

        return {
            send: function (sCmd, sArgs, fCallback) {

                var oArgs = arguments;

                var nId = 0;

                //只有一个参数是removeListener, 只需要传递一个id
                if (oArgs.length == 1) {
                    nId = sCmd;
                    sCmd = '';
                } else {
                    //否则都是请求，需要生成request id
                    nId = window.external.GetNextReqID();
                }

                if (sArgs) {
                    sArgs = JSON.stringify(sArgs);
                }

                if (fCallback) {
                    oExternalEvents[nId] = fCallback;
                }

                nId = nId || '';
                sCmd = sCmd || '';
                sArgs = sArgs || '[]';

                window.external.StartRequest(nId, sCmd, sDispatchEventName, sArgs, "");

                return nId;
            },

            appSend: function (sCmd, oArgs, fCallback) {
                return bdc.external.send(
                    HUB_API,
                    {
                        app_id : bdc.app.getId(),
                        api_str: sCmd,
                        args   : oArgs
                    },
                    function (oData) {
                        fCallback && fCallback(oData);
                    }
                );
            },

            appListener: function (sCmd, oArgs, fCallback) {
                oArgs = oArgs || {};
                var sSuffix = '.' + (oArgs.operation || oArgs.operator || 'add') + 'Listener';
                return bdc.external.send(
                    HUB_API + sSuffix,
                    {
                        app_id : bdc.app.getId(),
                        api_str: sCmd,
                        args   : oArgs
                    },
                    function (oData) {
                        fCallback && fCallback(oData);
                    }
                );
            }
        }

    }()));

    /**
     * **bdc.app** 提供处理所有的跟应用相关的接口，包括当前应用的以及对所有应用的操作
     * @member bdc
     * @static
     */
    bdc.app = extend(bdc.app, (function () {

        var currentAppId = null;

        return {

            /**
             * 应用初始化 [必须执行]
             * @member bdc.app
             * @param {Object} oParams 初始化参数
             * @param {Number} oParams.appId 应用ID
             * @fires init
             */
            init: function (oParams) {
                if (!oParams || !oParams.appId) {
                    throw 'bdc.app not initialized, please run bdc.app.init(APPID) first.';
                }
                currentAppId = oParams.appId;
                this.init = noop;
            },

            getId: function () {
                //if (!currentAppId) {
                //    throw 'bdc.app not initialized, please run bdc.app.init(APPID) first.';
                //}
                return currentAppId;
            },

            /**
             * APP初始化完成，每个APP必须调用
             * 当app初始化并且资源准备完毕时，调用ready方法通知客户端撤销loading蒙板，将app显示出来
             * @member bdc.app
             * @param {Function} [fCallback]  该命令执行后的回调
             * @param {Number} fCallback.error  错误码，0 表示正常
             * @param {String} fCallback.msg  操作结果
             * @param {Object} fCallback.body 返回的结果数据，此处为空
             */
            ready: function (fCallback) {
                bdc.external.appSend(
                    'local/basic/ready',
                    {},
                    fCallback
                );
            },

            /**
             * 展示 View
             * @member bdc.app
             * @param {Function} [fCallback]  该命令执行后的回调
             * @param {Number} fCallback.error  错误码，0 表示正常
             * @param {String} fCallback.msg  操作结果
             * @param {Object} fCallback.body 返回的结果数据，此处为空
             */
            show: function (data, fCallback) {
                return bdc.external.appSend(
                    'local/basic/show',
                    data || {},
                    fCallback
                );
            },

            /**
             * app 收起/关闭APP View
             * @member bdc.app
             * @param {Function} [fCallback]  该命令执行后的回调
             * @param {Number} fCallback.error  错误码，0 表示正常
             * @param {String} fCallback.msg  操作结果
             * @param {Object} fCallback.body 返回的结果数据，此处为空
             */
            hide   : function (fCallback) {
                return bdc.external.appSend(
                    'local/basic/hide',
                    {},
                    fCallback
                );
            },

            //1.9 add
            restart: function () {
                return bdc.external.appSend(
                    'local/basic/restart',
                    {}
                );
            },

            /**
             * 在应用中启动另一个应用
             *
             *     bdc.app.run({
             *         appId   : 12345678,
             *         timeout : 5000
             *     }, function(oData){
             *         console.log(oData);
             *        //输出
             *        {
             *            error : 0,    //0 正常 | 5 失败 | 6 超时
             *            msg   : 'OK', //OK | Fail | Timeout
             *            body  : {}
             *        }
             *
             *     });
             *
             * @member bdc.app
             * @param {Object} oParams 启动应用参数
             * @param {Number} oParams.appId 应用ID
             * @param {Number} [oParams.timeout] 毫秒值，启动超时设置, 默认超时时间 5000
             * @param {Function} fCallback 回调函数
             */
            openApp: function (oParams, fCallback) {
                return bdc.external.appSend(
                    'local/cross/open_app', {
                        app_id : oParams.appId,
                        timeout: oParams.timeout || 5000,
                        status : oParams.status || 'hide'
                    },
                    fCallback
                );
            },

            //JS传入参数：reqId, "lapuda_api_hub.addListener", callback, {"app_id": x, "api_str": "local/cross/send_msg", "args":{"message": "xxx", “to_app_id”: x}}

            /**
             * 向另一个应用发送单个消息
             * @member bdc.app
             * @param {Number} nAppId 接受消息的目标应用的appId
             * @param {Object|Array|String} oMessage 需要传递的消息
             * @param {Function} [fCallback] 目标应用的回调
             */
            sendMessage: function (nAppId, oMessage, fCallback) {

                if (typeof oMessage != 'string') {
                    try {
                        oMessage = JSON.stringify(oMessage)
                    } catch (e) {
                        oMessage = oMessage + '';
                    }
                }
                ;

                //JS传入参数：reqId, "lapuda_api_hub.addListener", callback, {"app_id": x, "api_str": "local/cross/send_msg", "args":{"message": "xxx", “to_app_id”: x}}
                bdc.external.appListener(
                    'local/cross/send_msg',
                    {
                        message  : oMessage,
                        to_app_id: nAppId
                    },
                    function (oResponse) {
                        var bNoError = oResponse.error == NO_ERROR;
                        var bIsResponse = oResponse.body.from_app_id;
                        var oResult = oResponse.body.message;
                        if (bNoError && bIsResponse) {
                            try {
                                oResult = JSON.parse(oResult);
                            } catch (e) {
                            }
                            fCallback(oResult);
                        }
                    }
                );
            },

            /**
             * 当应用接收到消息时触发。
             *
             *      //接口执行结果的回调信息为:
             *      {
             *           “error”: 0,
             *           “msg”: “…”,
             *           “body”: {"operation": “add”, “call_id”: xx} // 可以用call_id移除后续回调
             *      }
             *
             *      //收到其他APP用send/broadcast发送的消息时，回调的信息为：
             *      {
             *           “error”: 0,
             *           “msg”: “…”,
             *           “body”: {“from_app_id”: x, “from_call_id”: xx, “message”: “xxx” , “call_id”: “xx”} // call_id为set_msg_listener时的call_id
             *      }
             * @member bdc.app
             * @event
             * @param {Function} fHandler 事件处理器函数
             * @ignore
             */
            _onMessage: function (fHandler) {

                //JS传入参数：reqId, "lapuda_api_hub.addListener", callback, {"app_id":0, "api_str":" local/cross/set_msg_listener", "args":{"operation":"add"}}
                var nMsgReqId = bdc.external.appListener(
                    'local/cross/set_msg_listener',
                    {
                        operation: 'add'
                    },
                    fHandler
                );

                addListener(window, 'unload', function () {
                    bdc.external.appListener(
                        'local/cross/set_msg_listener',
                        {
                            operation: 'remove',
                            call_id  : nMsgReqId + ''
                        }
                    );
                });
            },

            _onStatusChange: function (fHandler) {

                var nStatusReqId = bdc.external.appListener(
                    'local/basic/set_status_listener',
                    {
                        operation: 'add'
                    },
                    fHandler
                );

                addListener(window, 'unload', function () {
                    bdc.external.appListener(
                        'local/cross/set_status_listener',
                        {
                            operation: 'remove',
                            call_id  : nStatusReqId + ''
                        }
                    );
                });
            },

            _responseMessage: function (oParams, fCallback) {
                return bdc.external.appSend(
                    'local/cross/response_msg',
                    {
                        message   : oParams.responseMessage,
                        to_app_id : oParams.toAppId,
                        to_call_id: oParams.toCallId
                    },
                    fCallback
                );
            },

            /**
             * 获取所有的apps配置信息
             *
             *     var nAppId = 11;
             *     bdc.app.getAppsInfo(nAppId, function(oData){
             *         console.log(oData);
             *         //输出
             *         {
             *             “error”: 0,
             *             “msg”: “”,
             *             “body”: [
             *                 {“app_id”:1, “app_name”:”a”, “app_conf”: {“k1”:”v1”}},
             *                 {“app_id”:2, “app_name”:”b”, “app_conf”: [1,2,3]},
             *                 {“app_id”:3, “app_name”:”c”, “app_conf”: “abc”}
             *             ]
             *         }
             *     });
             *
             *     //不指定appId时使用自己的appId
             *     bdc.app.getAppsInfo(function(oData){
             *         console.log(oData);
             *         //输出
             *         {
             *             “error”: 0,
             *             “msg”: “”,
             *             “body”: [
             *                 {“app_id”:1, “app_name”:”a”, “app_conf”: {“k1”:”v1”}},
             *                 {“app_id”:2, “app_name”:”b”, “app_conf”: [1,2,3]},
             *                 {“app_id”:3, “app_name”:”c”, “app_conf”: “abc”}
             *             ]
             *         }
             *     });
             * @member bdc.app
             * @param {Number} nAppId AppId
             * @param {Function} fCallback 回调函数
             */
            getAppsInfo: function (nAppId, fCallback) {
                if (arguments.length === 1) {
                    fCallback = nAppId;
                    nAppId = bdc.app.getId();
                }
                ;
                return bdc.external.appSend(
                    'local/cross/get_cross_conf',
                    {
                        app_id: nAppId
                    },
                    function (oAppsInfo) {
                        if (oAppsInfo.error == NO_ERROR) {
                            var oBody = oAppsInfo.body;
                            for (var i = 0; i < oBody.length; i++) {
                                try {
                                    oBody[i].app_conf = JSON.parse(
                                        oBody[i].app_conf
                                    );
                                } catch (e) {
                                }
                            }
                        }
                        ;
                        fCallback && fCallback(oAppsInfo);
                    }
                );
            }
        }
    })());

    /**
     * 绑定事件监听
     * @method on
     * @param {String} sEventType 事件类型
     * @param {Function} fHandler 事件处理函数
     * @member bdc.app
     * @inheritdoc Observer#on
     */

    /**
     * 移除事件监听
     * @method removeListener
     * @param {String} sEventType 事件类型
     * @param {Function} fHandler 事件处理函数
     * @member bdc.app
     * @inheritdoc Observer#removeListener
     */

    extend(bdc.app, new Observer());

    /**
     * 当收到应用消息时时触发
     *
     *      bdc.app.on('message', function(oEvtData, fResponse){
     *           fResponse({
      *             custom_message : 'get this message'
      *          });
     *      });
     *
     * @member bdc.app
     * @event message
     * @param {Object} oEvtData 消息对象
     * @param {Function} [fResponse] 可以立刻给发送方返回数据.
     */

    bdc.app.on('init', function () {
        bdc.app._onMessage(function (oData) {
            var bNoError = oData.error == NO_ERROR;
            var bIsMessage = oData.body.from_app_id;
            var fResponseCallback = function (oResponse) {
                if (typeof oResponse != 'string') {
                    oResponse = JSON.stringify(oResponse);
                } else {
                    oResponse = oResponse + '';
                }
                bdc.app._responseMessage({
                    toAppId        : oData.body.from_app_id,
                    toCallId       : oData.body.from_call_id,
                    responseMessage: oResponse
                });
                fResponseCallback = noop;
            };
            var sMessage = oData.body.message;
            var oMessage = null;

            try {
                oMessage = JSON.parse(sMessage);
            } catch (e) {
            }

            if (bNoError && bIsMessage) {
                bdc.app.fire('message', [oMessage, fResponseCallback]);
            }
        });

        bdc.app._onStatusChange(function (oData) {
            if (oData.error == 0 && oData.body.hasOwnProperty('status')) {
                bdc.app.fire('statuschange', [oData.body.status]);
            }
            ;
        })
    });

    /**
     * **bdc.tab** 提供处理tab
     * @member bdc
     * @static
     */
    bdc.tab = extend(bdc.tab, (function () {

        return {

            /**
             * 打开前景页
             *
             *     用户信息原始数据如下：
             *     {
             *          "error":0,
             *          "msg":"",
             *          "body":
             *          {
             *
             *          }
             *      }
             * @member bdc.tab
             * @param {Function} fCallback 回调函数
             * @param {String} fCallback.bduss bduss
             */
            startFront: function (fCallback) {
                //JS传入参数：reqId,"lapuda_api_hub_v2", callback, " {"app_id":0, "api_str":"local/tab/start_front_page", "args":{}}"
                return bdc.external.appSend(
                    'local/tab/start_front_page',
                    {},
                    fCallback
                );
            },

            /**
             * 前景页navigate
             *
             *     用户信息原始数据如下：
             *     {
             *          "error":0,
             *          "msg":"",
             *          "body":
             *          {
             *
             *          }
             *      }
             * @member bdc.tab
             * @param {Function} fCallback 回调函数
             * @param {String} fCallback.bduss bduss
             */
            navigateFront: function (sUrl, fCallback) {
                //JS传入参数：reqId,"lapuda_api_hub_v2", callback, " {"app_id":0, "api_str":"local/tab/navigate_front_page", "args":{}}"
                sUrl = sUrl || '';
                if (sUrl) {
                    return bdc.external.appSend(
                        'local/tab/navigate_front_page',
                        {
                            "url": sUrl
                        },
                        fCallback
                    );
                }

            }
        }
    })());

    /**
     * **bdc.account** 提供所有与账户操作有关的接口
     * @member bdc
     * @static
     */
    bdc.account = extend(bdc.account, {


        login : function(oParams, fCallback){
            return bdc.external.appSend('cloud/account/login',oParams, fCallback);
        },

        logout : function(sUid){
            return bdc.external.appSend('cloud/account/logout',{
                uid:sUid
            });
        },

        setLoginInfo : function(oParams){
            return bdc.external.appSend('cloud/account/set_login_info',extend({
            },oParams));
        },

        getLoginInfo : function(fCallback){
            return bdc.external.appSend('cloud/account/get_login_info',{},fCallback);
        },

        /**
         * 用户是否登陆
         * @member bdc.account
         * @param {Function} fCallback 回调函数
         * @param {Object} fCallback.oResult  回调参数
         * @param {Boolean} fCallback.oResult.isLogin 用户是否登陆
         */
        isLogin  : function (fCallback) {
            bdc.account.getUserInfo(function (oData) {
                var bIsLogin = oData.error == NO_ERROR;
                oData.body.isLogin = bIsLogin;
                fCallback(oData.body);
            });
        },
        /**
         * 导航到用户登陆页面
         * @member bdc.account
         */
        showLogin: function (oParams) {
            oParams = oParams || {
                back_url : location.href
            };
            location.href = LOGIN_URL + '?' + param(oParams);
        },

        /**
         * 获取用户信息
         *
         * 当出现错误时，error != 0并且msg带上错误显示，body部分此时可留空。error值目前为暂定，后续客户端可能会统一修改，下同。
         *
         *     用户信息原始数据如下：
         *     {
         *          "error":0,
         *          "msg":"",
         *          "body":
         *          {
         *              "uid":101,
         *              "display_name":"",
         *              "avatar_url":""
         *          }
         *     }
         *     //当出现错误时，error != 0并且msg带上错误显示，
         *     //body部分此时可留空。error值目前为暂定，后续客户端可能会统一修改，下同。
         * @member bdc.account
         * @param {Function} fCallback 回调函数
         * @param {Object} fCallback.oUserInfo 用户数据
         * @param {String} fCallback.oUserInfo.uid 用户uid
         * @param {String} fCallback.oUserInfo.display_name 用户名
         * @param {String} fCallback.oUserInfo.avatar_url 用户头像
         */
        getUserInfo: function (fCallback) {
            //JS传入参数：reqId, "lapuda_api_hub", callback, {"app_id":0, "api_str":"cloud/account/get_user_info", "args":[]}

            return bdc.external.appSend(
                'cloud/account/get_user_info',
                {},
                fCallback
            );
        },

        //获取用户bduss
        /**
         * 获取用户bduss
         *
         *     用户信息原始数据如下：
         *     {
         *          "error":0,
         *          "msg":"",
         *          "body":
         *          {
         *              "bduss":"xxx"
         *          }
         *      }
         * @member bdc.account
         * @param {Function} fCallback 回调函数
         * @param {String} fCallback.bduss bduss
         */
        getBDUSS   : function (fCallback) {
            //JS传入参数：reqId, "lapuda_api_hub", callback, {"app_id":0, "api_str":"cloud/account/get_bduss", "args":[]}

            return bdc.external.appSend(
                'cloud/account/get_bduss',
                {},
                fCallback
            );
        },

        /**
         * 获取logm的参数
         * @member bdc.account
         * @param [Function] fCallback 回调函数
         */
        getLogmArgs : function(fCallback){
            return bdc.external.appSend(
                'cloud/account/get_logm_args',
                {},
                fCallback
            );
        },

        /**
         * 用户登陆状态改变时触发
         *
         *     当handler被绑定时触发结果回调
         *     {
         *         "error":0,
         *         "msg":"",
         *         "body":
         *         {
         *             "operation":"add",
         *             "call_id":1000
         *         }
         *     }
         *
         *     当用户登陆时回调数据
         *     {
         *          "error":0,
         *          "msg":"",
         *          "body":
         *          {
         *              "action":"login",
         *              "call_id":1000,
         *
         *              "uid":101,
         *              "display_name":"",
         *              "avatar_url":""
         *          }
         *     }
         *
         *     当用户注销时回调数据
         *     {
         *          "error":0,
         *          "msg":"",
         *          "body":
         *          {
         *              "action":"logout",
         *              "call_id":1000,
         *              "uid":101
         *          }
         *     }
         *
         * @member bdc.account
         * @event
         * @param {Function} fHandler 事件处理函数
         * @ignore
         */
        _onChange: function (fHandler) {
            //JS传入参数：reqId, "lapuda_api_hub.addListener", callback, {"app_id":0, "api_str":"cloud/account/set_change_listener", "args":{"operation":"add"}}
            var nReqId = bdc.external.appListener(
                'cloud/account/set_change_listener',
                {
                    operation: 'add'
                },
                fHandler
            );

            addListener(window, 'unload', function () {
                bdc.external.appListener(
                    'cloud/account/set_change_listener',
                    {
                        operation: 'remove',
                        call_id  : nReqId
                    }
                );
            });
        }
    });

    /**
     * 绑定事件监听
     * @method on
     * @param {String} sEventType 事件类型
     * @param {Function} fHandler 事件处理函数
     * @member bdc.account
     * @inheritdoc Observer#on
     */

    /**
     * 移除事件监听
     * @method removeListener
     * @param {String} sEventType 事件类型
     * @param {Function} fHandler 事件处理函数
     * @member bdc.account
     * @inheritdoc Observer#removeListener
     */
    extend(bdc.account, new Observer());

    /**
     * 当登陆成功时触发
     *
     *      //登陆后触发
     *      bdc.account.on('login',function(oUserInfo){
     *          console.log(oUserInfo);
     *      });
     *
     * @member bdc.account
     * @event login
     * @param {Object} oEvtData
     */

    /**
     * 当登出时触发
     *
     *      //登出后触发
     *      bdc.account.on('logout',function(oUserInfo){
     *          console.log(oUserInfo);
     *      });
     * @member bdc.account
     * @event logout
     * @param {Object} oEvtData
     */

    /**
     * 当状态改变时触发
     *
     *      bdc.account.on('change',function(oUserInfo){
     *          console.log(oUserInfo.action);
     *          console.log(oUserInfo);
     *      });
     * @member bdc.account
     * @event change
     * @param {Object} oEvtData
     * @param {String} oEvtData.action login|logout
     * @ignore
     */
    bdc.app.on('init', function () {
        bdc.account._onChange(function (oData) {
            if (oData.error == NO_ERROR) {
                bdc.account.fire(oData.body.action, oData.body);
                bdc.account.fire('change', oData.body);
            }
        });
    });

    /**
     * Storage
     * @ignore
     * @class Storage
     * @param sApi
     * @constructor
     */
    var Storage = function (sApi) {
        this._api = sApi;
    }
    Storage.prototype = {
        getItem: function (sKey, fCallback) {
            return bdc.external.appSend(
                this._api + '/get',
                {
                    key: sKey
                },
                function (oData) {
                    fCallback(oData.body);
                }
            );
        },

        setItem: function (oParams, fCallback) {
            oParams.expireTime = oParams.expireTime || 0;

            //如果是Date对象就调用getTime
            if (oParams.expireTime instanceof Date) {
                oParams.expireTime = oParams.expireTime.getTime();
            } else if (typeof oParams.expireTime != 'number') {
                //不是数字就强制转换
                oParams.expireTime = parseInt(oParams.expireTime, 10) || 0;
            }

            if (typeof oParams.value != 'string') {
                try {
                    oParams.value = JSON.stringify(oParams.value);
                } catch (e) {
                }
            }

            //不能有负数
            oParams.expireTime = Math.max(0, oParams.expireTime);

            return bdc.external.appSend(
                this._api + '/set',
                {
                    key        : String(oParams.key),
                    value      : String(oParams.value),
                    expire_time: String(oParams.expireTime)
                },
                fCallback
            );
        },

        removeItem: function (sKey, fCallback) {
            return bdc.external.appSend(
                this._api + '/remove',
                {
                    key: sKey
                },
                fCallback
            );
        },

        clear: function (fCallback) {

            return bdc.external.appSend(
                this._api + '/clear',
                {},
                fCallback
            );
        },

        exist: function (sKey, fCallback) {
            return bdc.external.appSend(
                this._api + '/exist',
                {
                    key: sKey
                },
                function (oData) {
                    fCallback(oData.body.found);
                }
            );
        }
    };

    /**
     * **bdc.storage** 提供所有与应用本地存储有关的接口
     * 使用 bdc.storage API 存储、获取用户数据。
     * bdc.storage API提供了三种存储能力：本地存储
     * 提供本地存储（local/storage/disk/*）,会话存储（local/storage/memory/*）, 云端存储（cloud/storage/*）三种版本，三个版本接口一致，只是api_str不同。下面以本地存储
     * （local/storage/disk）为例介绍下5个接口
     * 所有local的存储按APP隔离，不受登陆状态影响。
     * 所有cloud的存储同时按user和app隔离，登陆时的切换逻辑待定。
     * Memory存储的生命周期为桌百客户端的起停。
     * @member bdc
     * @static
     */
    bdc.storage = {
        /**
         * 使用 bdc.storage API 存储、获取用户数据。
         * bdc.storage.local
         * @member bdc.storage
         * @property local
         */

        /**
         * 获取指定key的storage的值，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     bdc.storage.local.getItem('key', function(oValue){
         *          console.log(oValue);
         *     });
         * @method getItem
         * @member bdc.storage.local
         * @param {String} sKey 键名
         * @param {Function} fCallback 回调函数
         * @param {Object} fCallback.oValue 数据, 如果为空返回 null
         * @param {Boolean} fCallback.oValue.found 是否找到该数据
         * @param {String} fCallback.oValue.value  存储的数据
         * @param {Number} fCallback.oValue.expire_time  存储的数据
         */

        /**
         * 设置一个 storage，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     var expireTime = new Date();
         *     expireTime.setDate(expireTime.getMonth() + 1);
         *
         *     var oParams = {
         *          key        : 'mykey',
         *          value      : 'myvalue',
         *          expireTime : expireTime
         *     };
         *     bdc.storage.local.setItem(oParams ,function(oResult){
         *          console.log(oResult);
         *     });
         * @member bdc.storage.local
         * @method setItem
         * @param {Object} oParams 参数
         * @param {String} oParams.key 键名
         * @param {String} oParams.value 键值
         * @param {Number|Date} [oParams.expireTime] 绝对过期时间（毫秒值）,默认值为0，永远保存
         * @param {Function} [fCallback] 回调函数
         * @param {Object} [fCallback.result] 回调函数
         * @param {Number} fCallback.result.error 回调结果
         */

        /**
         * 移除指定key的 storage 项目
         *
         *     bdc.storage.local.removeItem('key', function(oResult){
         *          console.log(oResult);
         *     });
         * @member bdc.storage.local
         * @method removeItem
         * @param {String} sKey   键名
         * @param {Function} [fCallback] 回调函数
         * @param {Function} [fCallback.result] 回调函数
         */

        /**
         * 清空当前app的所有 storage 项目，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     bdc.storage.local.clear(function(oResult){
         *          console.log(oResult);
         *     });
         * @member bdc.storage.local
         * @method clear
         * @param {Function} [fCallback] 回调函数
         * @param {Function} [fCallback.oResult] 回调函数
         */

        /**
         * 判断指定key的storage的键是否存在，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     bdc.storage.local.exist('key', function(bResult){
         *          console.log(bResult);
         *     });
         * @member bdc.storage.local
         * @member exist
         * @param {String} sKey 键名
         * @param {Function} fCallback 回调函数
         * @param {Boolean} fCallback.bResult 返回是否存在这个键
         */
        local: new Storage('local/storage/disk'),

        /**
         * 使用 bdc.storage API 存储、获取用户数据。
         * bdc.storage.session
         * @member bdc.storage
         * @property session
         */

        /**
         * 获取指定key的storage的值，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     bdc.storage.session.getItem('key', function(oValue){
         *          console.log(oValue);
         *     });
         * @method getItem
         * @member bdc.storage.session
         * @param {String} sKey 键名
         * @param {Function} fCallback 回调函数
         * @param {Object} fCallback.oValue 数据, 如果为空返回 null
         * @param {Boolean} fCallback.oValue.found 是否找到该数据
         * @param {String} fCallback.oValue.value  存储的数据
         * @param {Number} fCallback.oValue.expire_time  存储的数据
         */

        /**
         * 设置一个 storage，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     var expireTime = new Date();
         *     expireTime.setDate(expireTime.getMonth() + 1);
         *
         *     var oParams = {
         *          key        : 'mykey',
         *          value      : 'myvalue',
         *          expireTime : expireTime
         *     };
         *     bdc.storage.session.setItem(oParams ,function(oResult){
         *          console.log(oResult);
         *     });
         * @member bdc.storage.session
         * @method setItem
         * @param {Object} oParams 参数
         * @param {String} oParams.key 键名
         * @param {String} oParams.value 键值
         * @param {Number|Date} [oParams.expireTime] 绝对过期时间（毫秒值）,默认值为0，永远保存
         * @param {Function} [fCallback] 回调函数
         * @param {Object} [fCallback.result] 回调函数
         * @param {Number} fCallback.result.error 回调结果
         */

        /**
         * 移除指定key的 storage 项目
         *
         *     bdc.storage.session.removeItem('key', function(oResult){
         *          console.log(oResult);
         *     });
         * @member bdc.storage.session
         * @method removeItem
         * @param {String} sKey   键名
         * @param {Function} [fCallback] 回调函数
         * @param {Function} [fCallback.result] 回调函数
         */

        /**
         * 清空当前app的所有 storage 项目，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     bdc.storage.session.clear(function(oResult){
         *          console.log(oResult);
         *     });
         * @member bdc.storage.session
         * @method clear
         * @param {Function} [fCallback] 回调函数
         * @param {Function} [fCallback.oResult] 回调函数
         */

        /**
         * 判断指定key的storage的键是否存在，该方法针对当前app，必须在bdc.app.init之后调用
         *
         *     bdc.storage.session.exist('key', function(bResult){
         *          console.log(bResult);
         *     });
         * @member bdc.storage.session
         * @member exist
         * @param {String} sKey 键名
         * @param {Function} fCallback 回调函数
         * @param {Boolean} fCallback.bResult 返回是否存在这个键
         */
        session: new Storage('local/storage/memory')
    };

    /**
     * **bdc.geo** 提供所有地理信息有关的接口
     * @member bdc
     * @static
     * @property {Object} geo
     */
    bdc.geo = extend(bdc.geo, {

        /**
         * 粗粒度获取地理信息，包含：国家，省份，城市，城市编码,  区县名称
         *
         *     bdc.geo.getCoarseLocation(function(oData){
         *          console.log(oData);
         *          //返回的数据
         *          {
         *              "error":0,
         *              "msg":"",
         *              "body":
         *              {
         *                  "country": "中国",
         *                  "province": "上海",
         *                  "city": "上海",
         *                  "city_code": 1001,
         *                  "district": "浦东新区"
         *              }
         *          }
         * @member bdc.geo
         * @param {Function} fCallback
         */
        getCoarseLocation: function (fCallback) {
            return bdc.external.appSend(
                'cloud/location/get_coarse_info',
                {},
                fCallback
            );
        },

        /**
         * 细粒度获取地理信息，包含：国家，省份，城市，城市编码,  区县名称，街道，街道号， 经度，维度，精度（半径）
         *
         *     bdc.geo.getFineLocation(function(oData){
         *         console.log(oData);
         *         //输出
         *         {
         *               "error":0,
         *               "msg":"",
         *               "body":
         *               {
         *                     "latitude" : 1.0,
         *                     "longitude" : 1.0,
         *                     "accuracy" : 1.0,
         *                     "country": "中国",
         *                     "province": "上海",
         *                     "city": "上海",
         *                     "city_code": 1001,
         *                     "district": "浦东新区",
         *                     "street": "金科路",
         *                     "street_number": 701
         *               }
         *         }
         *      });
         * @member bdc.geo
         * @param {Function} fCallback
         */
        getFineLocation: function (fCallback) {
            return bdc.external.appSend(
                'cloud/location/get_fine_info',
                {},
                fCallback
            );
        }
    });

    bdc.net = extend(bdc.net, {
        //1.9 add
        report : function (nModuleId, oReportData) {
            if (type(oReportData) == 'object') {
                oReportData = [oReportData];
            }
            var aRealReportData = [];
            each(oReportData, function (oItem, nIndex) {

                if (oItem.hasOwnProperty('key') && oItem.hasOwnProperty('value')) {
                    aRealReportData.push(oItem);
                } else {
                    for (var sProp in oItem) {
                        aRealReportData.push({
                            key  : parseInt(sProp),
                            value: oItem[sProp]
                        });
                    }
                }
            });

            bdc.external.appSend(
                'cloud/statistics/report',
                [
                    nModuleId,
                    aRealReportData
                ]
            );
        },

        //1.9 add
        request: function (oConfig) {
            var url = '';
            var postData = '';
            oConfig = oConfig || {};
            oConfig.charsetFrom = oConfig.charsetFrom || 'utf-8';
            oConfig.charsetTo = oConfig.charsetTo || 'utf-8';
            oConfig.browserCookie = oConfig.browserCookie || true;
            oConfig.headers = oConfig.headers || [];
            oConfig.data = oConfig.data || '';
            oConfig.dataType = oConfig.dataType || 'text';
            oConfig.type = (oConfig.type || 'get').toLowerCase();
            oConfig.success = oConfig.success || noop;
            oConfig.error = oConfig.error || noop;
            oConfig.complete = oConfig.complete || noop;
            oConfig.timeout = oConfig.timeout || 8000;

            var parseHeaders = function (original) {
                var arr = original.split(/\r\n/);
                var map = {};
                each(arr, function (line) {
                    var field = line.split(/:\s*/);
                    if (field.length == 2) {
                        map[field[0]] = field[1];
                    }
                });
                return map;
            }

            var transData = function (data) {
                if (typeof data == 'object') {
                    return param(data);
                } else {
                    return data + '';
                }
            }

            var attachUrl = function (url, data) {

                do {
                    if (/\?$/.test(url) || (/\?/.test(url) && /&$/.test(url))) {
                        url += data;
                        break;
                    }

                    if (/\?/.test(url)) {
                        url += '&' + data;
                        break;
                    }

                    url += '?' + data;

                } while (false);

                return url;
            }

            if (oConfig.type.toLowerCase() == 'post') {
                url = oConfig.url;
                postData = transData(oConfig.data);
            } else {
                url = attachUrl(oConfig.url, transData(oConfig.data));
            }

            var bIsTimeout = false;

            var nTimeoutTimer = setTimeout(function () {
                bIsTimeout = true;
                var status = 'timeout';
                var headers = {};
                oConfig.error({}, status);
                oConfig.complete('', headers, status);
            }, oConfig.timeout);

            bdc.external.appSend(
                'local/net/http_request',
                {
                    url        : url,
                    method     : oConfig.type,
                    headers    : oConfig.headers,
                    charset_from: oConfig.charsetFrom,
                    //browser_cookie: oConfig.browserCookie,
                    post_data  : postData
                },
                function (responseData) {

                    if (bIsTimeout) {
                        return;
                    }

                    clearTimeout(nTimeoutTimer);

                    var headers = {};
                    var status = 0;
                    var body = null;
                    var data = null;
                    var ajaxSuccess = true;

                    if (responseData.error == 0 && responseData.body) {

                        body = responseData.body;
                        status = body.status_code;
                        headers = parseHeaders(body.response_head);
                        data = body.response_body;

                        if (status >= 200 && status < 300) {

                            if (oConfig.dataType == 'json') {
                                try {
                                    data = JSON.parse(data);
                                } catch (e) {
                                    ajaxSuccess = false;
                                    status = 'parse error';
                                }
                            }

                        } else {
                            ajaxSuccess = false;
                        }
                    } else {
                        ajaxSuccess = false;
                    }

                    if (ajaxSuccess) {
                        oConfig.success(data, headers, status);
                    } else {
                        oConfig.error(headers, status);
                    }

                    oConfig.complete(data, headers, status);
                }
            )
        }
    });

    /**
     * **bdc.message** 提供与消息提醒相关接口
     * @member bdc
     * @static
     */
    bdc.message = extend(bdc.message, {

        /**
         * 向消息中心推送消息
         *
         *
         * @member bdc.message
         * @param {Object} oParams 推送消息参数
         * @param {Function} fCallback 回调函数
         */
        push: function (oParams, fCallback) {
            var sParamType = type(oParams);
            var array = [];
            if (sParamType == 'object') {
                array.push(oParams);
            }

            if (sParamType == 'array') {
                array = oParams;
            }

            return bdc.external.appSend(
                'cloud/message/push',
                array,
                fCallback
            );
        },

        /**
         * 增加事件监听
         *
         *     当handler被绑定时触发结果回调
         *     {
         *         "error":0,
         *         "msg":"",
         *         "body":
         *         {
         *             "operation":"add",
         *             "call_id":1234567890
         *         }
         *     }
         *
         *     当发生app消息推送事件，发生主动回调，回调消息错误码永远是0
         *     {
         *          "error":0,
         *          "msg":"",
         *          "body":
         *          {
         *              "call_id":"1234567890",
         *              "msg_id":"11111",
         *
         *              "title":"",
         *              "msg_content":""
         *          }
         *     }
         *
         *     删除事件监听
         *     {
         *          "error":0,
         *          "msg":"",
         *          "body":
         *          {
         *              "operation":"remove",
         *              "call_id":"1234567890"
         *          }
         *     }
         *
         * @member bdc.message
         * @event
         * @param {Function} fHandler 事件处理函数
         * @ignore
         */
        _onChange: function (fHandler) {
            //JS传入参数：reqId, "lapuda_api_hub.addListener", callback, " {"app_id":11, "api_str":"cloud/message/set_message_listener", "args":{"operation":"add",}}"
            var nReqId = bdc.external.appListener(
                'cloud/message/set_message_listener',
                {
                    operation: 'add'
                },
                fHandler
            );

            addListener(window, 'unload', function () {
                bdc.external.appListener(
                    'cloud/message/set_message_listener',
                    {
                        operation: 'remove',
                        call_id  : nReqId
                    }
                );
            });
        }
    });

    /**
     * 绑定事件监听
     * @method on
     * @param {String} sEventType 事件类型
     * @param {Function} fHandler 事件处理函数
     * @member bdc.message
     * @inheritdoc Observer#on
     */

    /**
     * 移除事件监听
     * @method removeListener
     * @param {String} sEventType 事件类型
     * @param {Function} fHandler 事件处理函数
     * @member bdc.message
     * @inheritdoc Observer#removeListener
     */
    extend(bdc.message, new Observer());

    bdc.client = extend(bdc.client, {
        //1.9 add
        getVersion: function (fCallback) {

            bdc.external.appSend('local/basic/versions', {}, function (oResult) {
                if (oResult.error === 0) {
                    fCallback(oResult.body);
                } else {
                    fCallback(null);
                }
            });
        },

        //1.9 add
        getGUID   : function (fCallback) {
            bdc.external.appSend('local/basic/guid', {}, function (oResult) {
                if (oResult.error === 0) {
                    fCallback(oResult.body);
                } else {
                    fCallback(null);
                }
            });
        },

        //1.9 add
        run       : function (sProgramPath, fCallback) {
            bdc.external.appSend('local/basic/open_software', {
                soft_path: sProgramPath
            }, fCallback);
        },

        openUrl: function (sUrl, sWay) {
            sWay = sWay || '';
            if (!/^(?:new_window|current_tab)$/.test(sWay)) {
                sWay = 'new_window';
            }
            ;

            bdc.external.appSend('local/net/open_url', {
                way: sWay,
                url: sUrl
            });
        }
    });

    /**
     * 当状态改变时触发
     *
     *      bdc.account.on('message',function(oUserInfo){
     *          console.log(oUserInfo.action);
     *          console.log(oUserInfo);
     *      });
     * @member bdc.account
     * @event change
     * @param {Object} oEvtData
     * @param {String} oEvtData.action login|logout
     * @ignore
     */
    bdc.app.on('init', function () {
        bdc.message._onChange(function (oData) {
            if (oData.error == NO_ERROR) {
                bdc.account.fire(oData.body.action, oData.body);
                bdc.account.fire('message', oData.body);
            }
        });
    });

    bdc.notification = extend(bdc.notification, {
        getMessages: function (fCallback) {
            return bdc.external.appSend('local/dc/request', {
                type    : 2,
                req_json: 'xiaoxizhongxin'
            }, function (oData) {
                if (oData.error === 0) {
                    oData.body.rsp_json = JSON.parse(oData.body.rsp_json);
                }
                fCallback(oData);
            });
        },

        setMessageReadMark: function (sKeyId) {
            return bdc.external.appSend('local/dc/request', {
                type    : 1,
                req_json: JSON.stringify({
                    "operation_type": "read",
                    "resource_type" : "xiaoxizhongxin",
                    "key_id"        : sKeyId
                })
            });
        },

        removeMessage: function (sKeyId) {
            return bdc.external.appSend('local/dc/request', {
                type    : 1,
                req_json: JSON.stringify({
                    "operation_type": "remove",
                    "resource_type" : "xiaoxizhongxin",
                    "key_id"        : sKeyId
                })
            });
        },

        removeAllMessages: function () {
            return bdc.external.appSend('local/dc/request', {
                type    : 1,
                req_json: JSON.stringify({
                    "operation_type": "removeall",
                    "resource_type" : "xiaoxizhongxin"
                })
            });
        }
    });

    bdc.utils = extend(bdc.utils, {
        param : param,
        type  : type,
        each  : each,
        noop  : noop,
        extend: extend
    });

    bdc.app.fire('init');

}(window, document));