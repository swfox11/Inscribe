import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { signinInput, signupInput} from "@sdasfox/common"
export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    }
}>();

userRouter.post('/signup', async (c) => {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
     
    try {
        const body = await c.req.json();
        const { success } = signupInput.safeParse(body);
        if (!success) {
            c.status(400);
            return c.json({ error: "invalid input" });
        }
  
    const user = await prisma.user.create({
      data: {
        email: body.username,
        password: body.password,
        name: body.name
      },
    });
  

    const jwt = await sign({
        id: user.id
      }, c.env.JWT_SECRET);
  
      return c.text(jwt)

    } catch (error) {
        c.status(411);
        return c.json({ msg: "error/ user already exists"});
    }
    
})
  
userRouter.post('/signin', async (c) => {
    const prisma = new PrismaClient({
    
        datasourceUrl: c.env?.DATABASE_URL	,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    console.log(body);
        const { success } = signinInput.safeParse(body);
        if (!success) {
            c.status(400);
            return c.json({ error: "invalid input" });
        }
        try {
            const user = await prisma.user.findUnique({
                where: {
                    email: body.username,
                    password: body.password
                }
            });
        
            if (!user) {
                c.status(403);
                return c.json({ error: "user not found" });
            }
        
            const jwt = await sign({
                id: user.id
              }, c.env.JWT_SECRET);
          
              return c.text(jwt)
        } catch (error) {
            console.log(error);
            c.status(411);
            return c.text('Invalid')
        }
    
})
