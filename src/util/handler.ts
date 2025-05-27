import Status from '@/enum/status';
import Method from '@/enum/method';

import { InvalidToken, ValidationError } from '@/util/errors';
import Logger from '@/util/logger';
import db from '@/util/database';

import { CookieOptions, RequestFile, Session, User } from '@/interfaces';

import { ZodObject } from 'zod';
import { verify } from 'jsonwebtoken';

/**
 * Request class to handle incoming requests.
 *
 * @class Request
 */
export class Request {
  public method: Method;
  public headers: { [key: string]: string };
  public query: { [key: string]: string | number };
  public body: { [key: string]: any };
  public files: RequestFile[];
  public params: { [key: string]: string | number };
  public cookies: { [key: string]: string | number };
  public ip: string;

  private logger = new Logger('crss::api::handler::req');

  /**
   * Implement a method instead of using this!
   * This is only public for testing purposes.
   */
  public req: any;

  private res: Response<unknown>;

  constructor(req: any, res: Response<unknown>) {
    this.method = req.method;
    this.headers = req.headers;

    this.query = req.query;
    this.body = req.body;
    this.files = req.files;
    this.params = req.params;
    this.cookies = req.cookies;

    this.ip = req.headers['x-forwarded-for'] || req.ip;

    this.req = req;
    this.res = res;
  }

  public getHeader(key: string): string | undefined {
    return this.headers[key.toLowerCase()];
  }

  public getParam(key: string): string | number | undefined {
    return this.params[key.toLowerCase()];
  }

  public getQuery(key: string): string | number | undefined {
    return this.query[key.toLowerCase()];
  }

  public getCookie(key: string): string | number | undefined {
    return this.cookies[key.toLowerCase()];
  }

  /**
   * Validate the request body against a Zod schema.
   *
   * @param schema The Zod schema to validate against.
   * @returns The validated data.
   * @throws ValidationError if the validation fails.
   * @example
   * ```ts
   * const schema = z.object({
   *   name: z.string(),
   *   age: z.number()
   * });
   * const data = req.validate(schema);
   * ```
   */
  public validate<T extends ZodObject<any>>(schema: T): T['_output'] {
    const res = schema.safeParse(this.req.body);

    if (!res.success) {
      const issues = res.error.issues;
      const missingFields: string[] = [];
      const malformedFields: { name: string; type: string }[] = [];

      issues.forEach((issue) => {
        if (issue.code === 'invalid_type' && issue.received === 'undefined')
          missingFields.push(issue.path.join('.'));
        if (issue.code === 'invalid_string')
          malformedFields.push({
            name: issue.path.join('.'),
            type: issue.validation as string
          });
      });

      if (missingFields.length > 0) {
        if (missingFields.length === 1) {
          this.res.error(
            Status.BadRequest,
            `The \`${missingFields[0]}\` is missing from the request body.`
          );
        } else {
          this.res.error(
            Status.BadRequest,
            `The following fields are missing from the request body: ${missingFields
              .map((field) => `\`${field}\``)
              .join(', ')}.`
          );
        }
      } else if (malformedFields.length > 0) {
        if (malformedFields.length === 1) {
          this.res.error(
            Status.BadRequest,
            `The \`${malformedFields[0].name}\` field is malformed. Expected a ${malformedFields[0].type}.`
          );
        } else {
          this.res.error(
            Status.BadRequest,
            `The following fields are malformed: ${malformedFields
              .map(
                (field) => `\`${field.name}\` should be a \`${field.type}\`.`
              )
              .join(', ')}.`
          );
        }
      }

      throw new ValidationError(issues);
    }

    return res.data;
  }

  public async user(): Promise<User | undefined> {
    const authorization = this.getHeader('authorization');

    if (authorization) {
      const split = authorization.split(' ');

      const type = split[0].toLowerCase();
      const token = split[1];

      // TODO: Implement server tokens so the mc servers can send authenticated requests for sensitive stuff like linking a mc account to a user.
      if (type === 'server') {
        this.res.error(
          Status.NotImplemented,
          'Authentiocated request from the minceraft servers are not yet implemented.'
        );

        throw new InvalidToken();
      }

      if (type !== 'bearer') {
        this.res.error(
          Status.BadRequest,
          'The authorization token must of type bearer.'
        );

        throw new InvalidToken();
      }

      try {
        // validate token
        const decoded = verify(token, process.env.JWT_SECRET!);

        if (typeof decoded === 'string') {
          this.logger.error('Expected `JwtPayload` got `string`.');

          throw new Error('Expected `JwtPayload` got `string`.');
        }

        const session = await db.query<Session>(
          'SELECT * FROM sessions WHERE id = $1',
          [decoded.sid]
        );

        if (session!.length !== 1) throw new Error('Session was not found.');
        const user = await db.query<User>('SELECT * FROM users WHERE id = $1', [
          session![0].user_id
        ]);

        return user![0];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e: any) {
        this.res.error(Status.BadRequest, 'Invalid authorization token.');

        throw new InvalidToken();
      }
    } else {
      this.res.error(
        Status.BadRequest,
        'The authorization header must be present on this route.'
      );

      throw new InvalidToken();
    }
  }
}

/**
 * Response class to handle outgoing responses.
 *
 * @class Response
 * @template T The type of the response data.
 */
export class Response<T> {
  /**
   * Implement a method instead of using this!
   * This is only public for testing purposes.
   */
  public res: any;

  private req: any;

  constructor(res: any, req: any) {
    this.res = res;

    this.req = req;
  }

  /**
   * Check if the request method is allowed.
   *
   * @param methods The allowed methods.
   *
   * @returns True if the method is allowed, false otherwise.
   *
   * @example
   * ```ts
   * if (!res.allow([Method.Get, Method.Post])) return;
   * ```
   */
  public allow(methods: Method[]): boolean {
    if (!methods.includes(this.req.method)) {
      this.res.set('Allow', methods.join(', ').toUpperCase());
      this.error(
        Status.MethodNotAllowed,
        `error.generic.methodNotAllowed;("${methods.join(', ')}")`
      );

      return false;
    }

    return true;
  }

  /**
   * Create a cookie.
   *
   * @param key The name of the cookie.
   * @param value The value of the cookie.
   * @param options The options for the cookie.
   */
  public cookie(key: string, value: string, options?: CookieOptions) {
    this.res.cookie(key.toLowerCase(), value, options);
  }

  /**
   * Redirect the request to a different URL.
   *
   * @param url The URL to redirect to.
   * @param code The status code to use for the redirect.
   */
  public redirect(url: string, code: Status = Status.Found) {
    this.res.redirect(code, url);
  }

  /**
   * Set the status code of the response.
   *
   * @param code The status code.
   * @returns An object with methods to send the response.
   * @example
   * ```ts
   * res.status(Status.Ok).json({ message: 'Hello World' });
   * ```
   */
  public status(code: Status) {
    return {
      /**
       * A JSON response.
       *
       * @param data The data to send.
       */
      json: (data?: T) => {
        this.res.status(code).json(data);
      },
      /**
       * A text response.
       *
       * @param data The data to send.
       */
      send: (data?: T) => {
        this.res.type('txt').status(code).send(data);
      },
      /**
       * Set the content type of the response.
       *
       * @param type The content type.
       */
      type: (type: string) => {
        return {
          /**
           * Send the response.
           *
           * @param data The data to send.
           */
          send: (data?: T) => {
            this.res.type(type).status(code).send(data);
          }
        };
      },
      /**
       * Send an empty response.
       */
      end: () => {
        this.res.status(code).end();
      }
    };
  }

  /**
   * Send an error response.
   *
   * @param code The status code.
   * @param message The error message.
   */
  public error(code: Status, message: string) {
    return this.res.status(code).json({
      error: code,
      message
    });
  }
}
