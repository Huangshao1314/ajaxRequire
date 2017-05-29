/*!
 * ajaxRequire v1.0.1
 * 并发 ajax 请求
 *
 * (c) 2014-2017 Junjie.Bai
 * MIT Licensed.
 *
 * https://github.com/baijunjie/ajaxRequire
 */
(function(root, factory) {
    'use strict';

    if (typeof module === 'object' && typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    } else if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        root.ajaxRequire = factory(root.jQuery);
    }

}(this, function($) {
    'use strict';

    var ajax,
        returnValueSet = {}, // 以请求的 req 为 key, 缓存所有请求返回值的集合
        checkRequireDataSet = {}; // 以请求的 req 为 key, 值为所有依赖该 req 的请求在进行 checkRequireArray 时所需的变量集合所组成的数组

    /**
     * ajax 请求队列
     * @param  {String | Object | Array} reqArr         所有请求的 url 组成的数组。
     *                                                  如果是单个请求，可直接传入 url 字符串。
     *                                                  如果请求需要配置具体的 ajax 参数，则传入一个配置对象。对象参数详见 jQuery.ajax() 的参数文档。
     *                                                  如果是多个请求，则传入这些请求 url 字符串或者 ajax 配置对象所组成的数组。
     * @param  {Function}                callback       所有 Ajax 请求就绪后的回调
     * @param  {Function}                errorCallback  Ajax 请求失败后的回调，会将错误信息作为参数传入。如果该参数传入一个对象，则会被视为 commonParams。
     * @param  {Object}                  commonParams   公共 Ajax 配置参数，将会应用在该次调用的所有 ajax 请求上，但会被每个 ajax 请求单独配置的参数覆盖。
     */
    function ajaxRequire(reqArr, callback, errorCallback, commonParams) {
        if (!$.isArray(reqArr)) {
            reqArr = [reqArr];
        }

        if ($.isPlainObject(errorCallback)) {
            commonParams = errorCallback;
            errorCallback = null;
        }

        var returnValueArr = [],
            def = new $.Deferred();

        $.each(reqArr, function(i, req) {
            var params = $.extend({}, commonParams);

            if (typeof req === 'string') {
                params.url = req;
            } else {
                $.extend(params, req);
            }

            req = stringify(params);

            if (params.cache !== false && returnValueSet[req]) {
                returnValueArr[i] = returnValueSet[req];
                delete reqArr[i];
                checkRequireArray(reqArr, returnValueArr, callback, def);
                return;
            }

            var checkRequireData = {
                index: i,
                def: def,
                reqArr: reqArr,
                returnValueArr: returnValueArr,
                callback: callback,
                errorCallback: errorCallback
            };

            if ($.isArray(checkRequireDataSet[req])) {
                // 检查请求集合中存在该 req，表示已经发出 ajax 请求
                // 这里只将需要检查的请求数据加入到集合中，然后返回
                checkRequireDataSet[req].push(checkRequireData);
                return;
            } else {
                // 检查请求集合中不存在该 req，表示还未发出 ajax 请求
                // 这里将需要检查的请求数据加入到集合中，然后开始 ajax 请求
                checkRequireDataSet[req] = [checkRequireData];
            }

            ajax(params, function(returnValue) {
                returnValueSet[req] = returnValue;

                $.each(checkRequireDataSet[req], function(i, data) {
                    var index = data.index,
                        def = data.def,
                        reqArr = data.reqArr,
                        returnValueArr = data.returnValueArr,
                        callback = data.callback;

                    returnValueArr[index] = returnValue;
                    delete reqArr[index];

                    checkRequireArray(reqArr, returnValueArr, callback, def);
                });

                delete checkRequireDataSet[req];
                return returnValue; // 传递给下一个then
            }, function() {
                var args = arguments;
                $.each(checkRequireDataSet[req], function(i, data) {
                    var def = data.def,
                        errorCallback = data.errorCallback;

                    if (def.state() !== 'pending') return;

                    try {
                        errorCallback && errorCallback.apply(null, args);
                    } catch(err) {
                        throw err;
                    }

                    def.reject.apply(null, args);
                });

                delete checkRequireDataSet[req];
                throw new Error('"' + req + '" require failed!');
            });
        });

        return def.promise();
    }

    // 用于修改 ajax 使用的方法
    ajaxRequire.ajax = function(func) {
        ajax = func;
    };

    function checkRequireArray(reqArr, returnValueArr, callback, def) {
        if ($.isEmptyObject(reqArr)) {
            try {
                callback && callback.apply(null, returnValueArr);
            } catch(err) {
                throw err;
            }

            def.resolve.apply(null, returnValueArr);
        }
    }

    function stringify(params) {
        var paramsType = typeof params;
        if (paramsType.match(/string|number/)) return params + '';;

        var paramArr = [];
        for (var key in params) {
            paramArr.push({
                'key': key,
                'value': stringify(params[key])
            });
        }

        // 根据 key 进行排序
        paramArr.sort(function(a, b) {
            var av = a['key'],
                bv = b['key'];
            return av.localeCompare(bv);
        });

        params = [];
        for (var i = 0, p; p = paramArr[i++];) {
            params.push(p['key'] + ':' + p['value']);
        }
        params = '{' + params.join(',') + '}';

        return params;
    }

    // 默认使用 jQuery.ajax
    ajaxRequire.ajax(function(params, done, fail) {
        params = $.extend(params, {
            type: 'GET',
            dataType : 'json'
        });
        $.ajax(params).done(done).fail(fail);
    });

    return ajaxRequire;
}));
