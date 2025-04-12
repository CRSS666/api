import Status from '@/enum/status';
import Method from '@/enum/method';

import { ValidationError } from '@/util/errors';

import { RequestFile } from '@/interfaces';

import { ZodObject } from 'zod';

export class Request {
  public method: Method;
  public headers: { [key: string]: string };
  public query: { [key: string]: string | number };
  public body: { [key: string]: any };
  public files: RequestFile[];
  public params: { [key: string]: string | number };
  public ip: string;

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
}

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

  public status(code: Status) {
    return {
      json: (data?: T) => {
        this.res.status(code).json(data);
      },
      send: (data?: T) => {
        this.res.type('txt').status(code).send(data);
      },
      type: (type: string) => {
        return {
          send: (data?: T) => {
            this.res.type(type).status(code).send(data);
          }
        };
      },
      end: () => {
        this.res.status(code).end();
      }
    };
  }

  public error(code: Status, message: string) {
    return this.res.status(code).json({
      error: code,
      message
    });
  }
}
