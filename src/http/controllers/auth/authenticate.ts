import { InvalidCredentialsError } from "@/lib/errors/invalid-credentials-error";
import { makeAuthenticateUseCase } from "@/lib/factories/make-authenticate-use-case";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
    const authenticateBodySchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
    })

    const { email, password } = authenticateBodySchema.parse(req.body);

    try {
        const sut = makeAuthenticateUseCase();

        const { user } = await sut.execute({
            email,
            password,
        })

        const token = await reply.jwtSign(
          {
            role: user.role
          }, 
          {
            sign: {
                sub: user.id,
            }
          }
        )

        const refreshToken = await reply.jwtSign(
            {
                role: user.role
            }, 
            {
              sign: {
                  sub: user.id,
                  expiresIn: '7d',
              },
            },
          )

        return reply
            .setCookie('refreshToken', refreshToken, {
                path: '/',
                secure: true,
                sameSite: true,
                httpOnly: true,
            })
            .status(200)
            .send({
            token,
        });
        
    } catch (err) {
        if(err instanceof InvalidCredentialsError) {
            return reply.status(400).send({ message: err.message });
        }

        throw err;
    }
}