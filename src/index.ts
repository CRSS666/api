import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import chalk from 'chalk';
import cookies from 'cookie-parser';

import path from 'node:path';

import { Request, Response } from '@/util/handler';
import Logger from '@/util/logger';
import ServerApi from '@/util/sap';
import version from '@/util/version';
import getRoutes from '@/util/get_routes';
import pathParser from '@/util/path_parser';
import rateLimiter from '@/util/ratelimit';

import Method from '@/enum/method';
import Discord from './util/discord';
const app = express();

const logger = new Logger('crss::api::main');
const webLogger = new Logger('crss::api::req');

const PORT = parseInt(process.env.PORT!) || 3000;

app.use((req, res, next) => {
  res.setHeader('X-Powered-By', `Magic/${version}`);
  next();

  const ip = req.headers['x-forwarded-for'] || req.ip;
  webLogger.info(
    `${ip} "${req.method} ${req.path} HTTP/${req.httpVersion}" ${res.statusCode} ${res.getHeader('Content-Length') ? res.getHeader('Content-Length') : '0'} "${req.get('Referer') ? req.get('Referer') : '-'}" "${req.get('User-Agent')}"`
  );
});

app.use(
  cors({
    maxAge: 86400
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(multer().any());
app.use(cookies());
app.use(rateLimiter);
app.use(express.static(path.join(__dirname, '..', 'data', 'static')));

app.use((err: any, req: any, res: any, next: any) => {
  webLogger.error(err.stack);

  res.status(500).json({
    error: 500,
    message: 'Internal Server Error'
  });
});

(async () => {
  const startTimestamp = Date.now();

  const routes: string[] = await getRoutes(path.join(__dirname, 'routes'));

  logger.info('○ Routes:', routes.length);
  for (const route of routes) {
    const routePath = pathParser(
      route.replace(__dirname, '').replace(/\\/g, '/')
    );
    const routeHandler = await import(route);

    const methods = Object.keys(routeHandler)
      .filter((key) => key !== 'default')
      .map((m) => {
        if (m === 'get') return Method.Get;
        if (m === 'post') return Method.Post;
        if (m === 'put') return Method.Put;
        if (m === 'del') return Method.Delete;
        if (m === 'patch') return Method.Patch;
        if (m === 'options') return Method.Options;
        if (m === 'head') return Method.Head;
        else return Method.Get;
      });
    const isValid = methods.length > 0;

    if (isValid) {
      logger.info(
        chalk.green('◆'),
        `\`${routePath}\``,
        '(' + methods.join(', ') + ')'
      );

      app.all(routePath, (req, res) => {
        try {
          const response = new Response(res, req);
          const request = new Request(req, response);

          if (!response.allow(methods)) return;
          switch (req.method) {
            case Method.Get:
              return routeHandler.get(request, response);
            case Method.Post:
              return routeHandler.post(request, response);
            case Method.Put:
              return routeHandler.put(request, response);
            case Method.Delete:
              return routeHandler.del(request, response);
            case Method.Patch:
              return routeHandler.patch(request, response);
            case Method.Options:
              return routeHandler.options(request, response);
            case Method.Head:
              return routeHandler.head(request, response);
            default:
              return routeHandler.get(request, response);
          }
        } catch (err: any) {
          webLogger.error(err.message);

          res.status(500).json({
            error: 500,
            message: 'Internal Server Error'
          });
        }
      });
    } else logger.info(chalk.red('◇'), `\`${routePath}\``);
  }

  app.use((req, res) => {
    res.status(404).json({
      error: 404,
      message: 'Not Found'
    });
  });

  app.listen(PORT, () => {
    logger.info('○ Port:', PORT);
    logger.info('○ Startup:', Date.now() - startTimestamp, '(ms)');
  });

  //ServerApi.getInstance('main', 'localhost:25580');
})().catch((err) => {
  if (!err['errors']) logger.error(err);
  else
    err['errors'].forEach((e: any) => {
      logger.error(e);
    });
});

// :3
(Date.prototype as any).toJSON = function () {
  return this.getTime();
};

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
