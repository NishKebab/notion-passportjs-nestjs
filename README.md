# notion-passportjs-nestjs
Notion Auth Strategy for NestJS and [passportjs](https://github.com/nestjs/passport)

I couldn't find an auth strategy for [Notion Oauth](https://developers.notion.com/docs/authorization). This strategy lets you pass in query params to the callback from the initial request. This is done here

```js
    if (!req.query.code) {
      options.state = req.query.email;
      return super.authenticate(req, options);
    }
```

If you don't need to pass through query params then set  `state: false`.

Notion requires 2 custom headers and a custom body for thier OAuth flow requiring a custom passport strategy. 


