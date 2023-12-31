const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dc6i71y.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection = client.db("techDB").collection("techProduct");
    const reviewsCollection = client.db("techDB").collection("reviews");
    const userProduct = client.db("techDB").collection("userProduct");
    const UserCollection = client.db("techDB").collection("users");



    //jwt related api

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token })
    })



    //insert email

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await UserCollection.findOne(query);

      if (existingUser) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }
      const result = await UserCollection.insertOne(user);
      res.send(result);
    })

    //middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'forbidden access' });
      }
      const token = req.headers.authorization.split(' ')[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await UserCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }


    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers)
      const result = await UserCollection.find().toArray();
      res.send(result);
    })



    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'unauthorized access' })
      }
      const query = { email: email };
      const user = await UserCollection.findOne(query);
      let admin = false;

      if (user) {
        admin = user?.role === 'admin';
      }

      res.send({ admin });
    })


    app.get('/users/mod/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await UserCollection.findOne(query);
      let moderator = false;
    
      if (user) {
        moderator = user?.role === 'moderator';
      }
    
      res.send({ moderator });
    })


    // Get all documents from collection
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    })
    

    //upvote button
    app.post('/api/upvote/:productId',  async (req, res) => {
      const productId = req.params.productId;
  
      try {
          const query = { _id: new ObjectId(productId) };
          const product = await menuCollection.findOne(query);
  
          if (!product) {
              return res.status(404).json({ error: 'Product not found' });
          }
  
          const updatedProduct = await menuCollection.findOneAndUpdate(
              query,
              { $inc: { upvote_count: 1 } }, // Increment upvote_count by 1
              { returnDocument: 'after' } // Return the updated document
          );
  
          res.json(updatedProduct.value); // Send the updated product back to the client
      } catch (error) {
          console.error('Error while upvoting product:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      }
  });


  //report button

  app.post('/api/report/:productId', async (req, res) => {
    const productId = req.params.productId;

    try {
        const query = { _id: new ObjectId(productId) };
        const product = await menuCollection.findOne(query);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Update the product with the report information
        const updatedProduct = await menuCollection.findOneAndUpdate(
            query,
            { $set: { report: 'reported' } }, // Set the 'report' field to 'reported'
            { returnDocument: 'after' } // Return the updated document
        );

        res.json(updatedProduct.value); // Send the updated product back to the client
    } catch (error) {
        console.error('Error while handling report:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
    
  //search
  app.get('/products', async (req, res) => {
    const searchTerm = req.query.search;
    const page = parseInt(req.query.page) || 1;
    const pageSize = 20;
    const skip = (page - 1) * pageSize;
  
    let query = {};
    if (searchTerm) {
    
      query = { tags: { $regex: new RegExp(searchTerm, 'i') } };
    }
  
    try {
      const result = await menuCollection
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .toArray();
  
      res.json(result);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });



    //api based on ID
    app.get('/products/:productId', async (req, res) => {
      const productId = req.params.productId;

      console.log('Received productId:', productId);

      try {
        const query = { _id: new ObjectId(productId) };
        //console.log(query);
        const result = await menuCollection.findOne(query);
        // console.log(result);

        if (!result) {
          res.status(404).json({ error: 'Product not found' });
          return;
        }

        res.json(result);

      } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    //userproduct

    app.post('/dashboard/userProduct', async (req, res) => {
      try {
        const newUserProduct = req.body;
        const result = await userProduct.insertOne(newUserProduct);
        res.send(result);
      } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    app.get('/dashboard/userProduct', async (req, res) => {
      const cursor = userProduct.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.delete('/dashboard/userProduct/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userProduct.deleteOne(query);
      res.send(result);
    })


    //reviews
    app.post('/reviews', async (req, res) => {
      try {
        const review = req.body;
        const result = await reviewsCollection.insertOne(review);
        res.send(result);
      } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    app.get('/reviews', async (req, res) => {
      const roomId = req.query.roomId;
      try {
        const query = { roomId: roomId };
        const result = await reviewsCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    //menu related api
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await UserCollection.deleteOne(query);
      res.send(result);
    })


    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await UserCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    app.patch('/users/mod/:id',verifyToken, verifyAdmin,  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'moderator'
        }
      }
      const result = await UserCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('server is running')
})

app.listen(port, () => {
  console.log(`server is running on port: ${port} `)
})