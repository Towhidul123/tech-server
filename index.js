const express = require('express');
const cors = require ('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app. use(express.json());




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

    // Get all documents from collection
    app.get('/menu', async(req,res)=>{
      const result = await menuCollection.find().toArray();
      res.send(result);
    })


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