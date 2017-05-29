# ajaxRequire

主要用于完成并发 ajax 请求！

基于 [jQuery](https://github.com/jquery/jquery)！对 jQuery 过敏者请绕道 ~ 囧

如果是 async 函数的 “高端” 使用者请无视 ~ 囧

如果是 Promise 对象的使用者，它可以改善你的使用体验！

如果是 jQuery 的忠实用户，那它就是必须的！ㄟ( ▔, ▔ )ㄏ



### 如何使用

安装

```shell
$ npm i ajax-require
```

就像使用 require.js 一样

```js
import ajaxRequire from 'ajax-require';

ajaxRequire(['./A.json', './B.json'], function(A, B) {
    //...
});
```



### 为什么使用？

项目开发中，经常会遇到某些操作会依赖两个或多个接口的返回值。

通常我们可能是这样

```js
$.getJSON('http://xxx.com/api/getA', function(AData) {
    $.getJSON('http://xxx.com/api/getB', function(BData) {
        // AData + BData => ooxx
    });
});
```

也可能是这样

```js
var promiseA = new Promise(function(resolve, reject) {
    $.getJSON('http://xxx.com/api/getA', (AData) => resolve(AData))
        .fail((jqXHR, status) => reject(new Error(status)));
});
var promiseB = new Promise(function(resolve, reject) {
    $.getJSON('http://xxx.com/api/getB', (BData) => resolve(BData))
        .fail((jqXHR, status) => reject(new Error(status)));
});
var promise = Promise.all([promiseA, promiseB]);
p.then(function([AData, AData]) {
    // AData + BData => ooxx 好累！有木有
});
```

现在，我们只需这样

```js
ajaxRequire([
    'http://xxx.com/api/getA',
    'http://xxx.com/api/getB'
], function(AData, BData) {
    // AData + BData => 让我们愉快的去 ooxx
}, function(err) {
    // 出了点小意外...
});
```



### 参数详解

```js
ajaxRequire(reqArr, callback, errorCallback, commonParams)
```

- `reqArr` - 所有请求的 url 组成的数组。如果是单个请求，可直接传入 url 字符串。如果请求需要配置具体的 ajax 参数，则传入一个配置对象。对象参数详见 `jQuery.ajax()` 的[参数文档](http://jquery.cuishifeng.cn/jQuery.Ajax.html)。如果是多个请求，则传入这些请求 url 字符串或者 ajax 配置对象所组成的数组。
- `callback` - 所有 Ajax 请求就绪后的回调，并将请求结果作为参数按请求顺数传入。如果该参数传入一个对象，则会被视为 `commonParams`。
- `errorCallback` - Ajax 请求失败后的回调，会将错误信息作为参数传入。如果该参数传入一个对象，则会被视为 `commonParams`。
- `commonParams` - 公共 Ajax 配置参数，将会应用在该次调用的所有 ajax 请求上，但会被每个 ajax 请求单独配置的参数覆盖。

同时，ajaxRequire 也会返回一个 jQuery 的 Deferred 对象，支持类似 Promise 的语法规则。这里 `catch()` 需要 jQuery 3.1+ 版本才能支持，否则请使用 `fail()` 来代替。

```js
ajaxRequire([
    'http://xxx.com/api/getA',
    'http://xxx.com/api/getB'
]).then(function(AData, BData) {
    // AData + BData => 让我们再次愉快的去 ooxx
}).catch(function(err) {
    // 又出了点小意外...
});
```

注意！默认情况下，ajaxRequire 会缓存接口的返回结果，再第二次请求相同接口且参数相同时，会将第一次请求的结果再次返回给你，就像 require.js 的工作方式，如果你希望每次请求都重新发送，可以通过设置 `cache` 参数为 `false` 来解决。

```js
ajaxRequire([
    {
        url: 'http://xxx.com/api/getA',
        cache: false
    },
    'http://xxx.com/api/getB'
]).then(function(AData, BData) {
    // AData + BData => 让我们又一次愉快的去 ooxx
}).catch(function(err) {
    // 我为什么要说又？...
});
```



### 扩展

ajaxRequire 默认使用 `jQuery.ajax()`，实际上它是这么设置的

```js
// 默认使用 jQuery.ajax
ajaxRequire.ajax(function(params, done, fail) {
    params = $.extend(params, {
        type: 'GET',
        dataType : 'json'
    });
    $.ajax(params).done(done).fail(fail);
});
```

`ajaxRequire.ajax()` 方法允许你修改它使用的 ajax 方法，比如你更喜欢使用 vue-resource

```js
// 修改成 vue-resource
ajaxRequire.ajax(function(params, done, fail) {
    // 可以做一些易用性的预处理
    if (params.method.match(/get/i)) {
        parems.params = params.data;
    } else if (params.method.match(/post|put|patch/i)) {
        parems.body = params.data;
    }
    Vue.http(params).then(done).catch(fail);
});
```

它的参数很容易理解：

- `params` - 表示你在请求时的传参。如果你只传了一个 url，那么它就等于 { url: xxx }。
- `done` - 你修改的 Ajax 方法成功后的回调。
- `fail` - 你修改的 Ajax 方法失败后的回调。

