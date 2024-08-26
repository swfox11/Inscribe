import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { verify } from "hono/jwt";
import { signinInput, signupInput, createBlogInput, updateBlogInput} from "@sdasfox/common"

export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    }, 
    Variables: {
        userId: string;
    }
}>();

blogRouter.use("/*", async (c, next) => {
    const authHeader = c.req.header("authorization") || "";
    console.log(authHeader);
    try {
        const user = await verify(authHeader, c.env.JWT_SECRET);
        
        if (user) {
            //@ts-ignorea
            c.set("userId", user.id);
            await next();
        } else {
            c.status(403);
            return c.json({
                message: "You are not logged in"
            })
        }
    } catch(e) {
        c.status(403);
        console.log(e);
        return c.json({
            message: "You are not logged in"
        })
    }
});


blogRouter.post('/', async (c) => {
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
    
        const body = await c.req.json();
        const { success } = createBlogInput.safeParse(body);
        if (!success) {
            c.status(400);
            return c.json({ error: "invalid input" });
        }
        
	    const post = await prisma.blog.create({
		data: {
			title: body.title,
			content: body.content,
			authorId: Number(userId),
            timestamp: new Date(),
		}
	});
	return c.json({
		id: post.id
	});
    
	
})

blogRouter.put('/', async (c) => {
	const userId = c.get('userId');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
        if (!success) {
            c.status(400);
            return c.json({ error: "invalid input" });
        }
	const post=await prisma.blog.update({
		where: {
			id: body.id,
			authorId: Number(userId),// can be problematic
		},
		data: {
			title: body.title,
			content: body.content,
            timestamp: new Date()
		}
	});

	return c.json({
        id: post.id
    })
});



blogRouter.get('/bulk', async (c) => {
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
	
	const posts = await prisma.blog.findMany({
        select: {
            content: true,
            title: true,
            id: true,
            timestamp: true,
            author: {
                select: {
                    name: true
                }
            }
        }
    });

	return c.json({posts});
});

blogRouter.get('/:id', async (c) => {
	const id = c.req.param('id');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());
	
    try {
        const post = await prisma.blog.findUnique({
            where: {
                id: Number(id),
            },select: {
                id: true,
                title: true,
                content: true,
                timestamp: true,
                author: {
                    select: {
                        name: true
                    }
                }
            }
        }
        );
    
        return c.json({post});
    } catch (error) {
        c.status(411);
        c.json({error: "error while fetching post"});
    }
	
});
