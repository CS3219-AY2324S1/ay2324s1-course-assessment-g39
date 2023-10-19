import { type Request, type RequestHandler, type Response } from 'express';
import { decode } from 'next-auth/jwt';
import asyncHandler from 'express-async-handler';
import { prismaPostgres } from './db';
// reusable file for decoding next-auth jwt token
function getcookies(req: Request) {
    const cookie = req.headers.cookie;
    // user=someone; session=mySessionID
    const result = new Map<string, string>();
    
    cookie?.split('; ').forEach((val) => {
      const splitValues = val.split('=');
      result.set(splitValues.at(0) ?? "", splitValues.at(1) ?? ""); 
    });
    return result;
  }
  
  
 export const authenticationMiddleware = asyncHandler(async (req: Request, res: Response, next) => {
    const cookies = getcookies(req);
    const sessionToken = cookies.get("next-auth.session-token");
    const session = await decode({ token: sessionToken, secret: process.env.NEXT_AUTH_SECRET ?? ""});
    if (!session
      || session.exp as number < new Date().getTime()) {
      res.status(401).json({
        message: "Unauthorised"
      })
      return;
    };
    const user = await prismaPostgres.user.findUnique({
      where: {
        id: session.id as string
      }
    });
    if (!user || user.email != session.email) {
      res.status(401).json({
        message: "Unauthorised"
      })
      return;
    }
    next();
  });
  