const express = require('express')
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const app = express()
const port =process.env.PORT || 5000;


app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4qnoj0d.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// function verifyJWT start 

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'UnAuthorized access'});
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
   if(err) {
     return res.status(403).send({message: 'forbidden access'})
   }
   req.decoded = decoded;
   next();
  });
}
// function verifyJWT end 

async function run(){
try{
  await client.connect();
const servicesCollection = client.db('manufacturer').collection('service');
const orderCollection = client.db('manufacturer').collection('order');
const userCollection = client.db('manufacturer').collection('users');
const reviewCollection = client.db('manufacturer').collection('review');
const paymentCollection = client.db('manufacturer').collection('payment');
const tasksCollection = client.db('tasks').collection('addtasks');


 
  // verifyadmin  function start 
  const verifyadmin = async(req,res,next) => {
    const requester = req.decoded.email;
    const requesterAccoount = await userCollection.findOne({email: requester});
    if(requesterAccoount.role === 'admin'){ 
      next();
    }else {
      res.status(403).send({message: 'forbidden'});
    }

  }
  // verifyadmin function end
  // userCollection with email start

app.put('/user/:email', async(req,res) => {
  const email = req.params.email;
  const user = req.body;
  const filter = {email:email};
  const options = { upsert: true};
  const updateDoc = {
    $set: user,
  };
  const result = await userCollection.updateOne(filter,updateDoc,options);
  // added jwt token 
  const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET,)
  res.send({result,token});
})

// userCollection with email end 

// show all service 
app.get('/service',async(req,res) => {
  const query = {};
  const cursor = servicesCollection.find(query);
  const services = await cursor.toArray();
  res.send(services);
})
// add products start 
app.post('/addproduct', async(req,res) => {
  const order = req.body;
  const result = await servicesCollection.insertOne(order);
  res.send(result);
})
// add products end 
  // delete product  
  app.delete('/service/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const result = await servicesCollection.deleteOne(filter);
    res.send(result);
  });

  
  // delete ORDER 2 
  app.delete("/orders/:id",verifyJWT, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: ObjectId(id) };
    const result = await orderCollection.deleteOne(filter);
    res.send(result);
  });

app.get('/purchase/:id',async(req,res) => {
  const id =req.params.id;
  console.log(id);
  const query={_id: ObjectId(id)};
  const Purchases = await servicesCollection.findOne(query);
  res.send(Purchases);
});


// order collection  start 
app.post('/order', async(req,res) => {
  const order = req.body;
  const result = await orderCollection.insertOne(order);
  res.send(result);
})
// order collection end 
app.post('/tasks', async(req,res) => {
  const order = req.body;
  const result = await tasksCollection.insertOne(order);
  res.send(result);
})
// order collection end 
// start show all order for user
app.get('/orders', async(req,res) => {
  const email = req.query.email;
  const query = {email:email};
  const orders = await orderCollection.find(query).toArray();
  res.send(orders);
})
// start show all order for admin 
// show all service 
app.get('/allorder',async(req,res) => {
  const query = {};
  const cursor = orderCollection.find(query);
  const order = await cursor.toArray();
  res.send(order);
})

// payment route start for oders 

app.get('/order/:id',async(req, res) =>{
  const id = req.params.id;
  const query = {_id: ObjectId(id)};
  const order = await orderCollection.findOne(query);
  res.send(order);
}) 

// payment start
app.post('/create-order-payment', verifyJWT, async(req, res) =>{
  const service = req.body;
  const price = service.price;
  const amount = price*100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount : amount,
    currency: 'usd',
    payment_method_types:['card']
  });
  res.send({clientSecret: paymentIntent.client_secret})
});


// payment end
  // update payment in my deshbord 
  
  app.patch('/payment/:id', verifyJWT,async(req, res) => {
    const id = req.params.id;
    const payment = req.body;
    const filter = {_id: ObjectId(id)};
    const updatedDoc = {
      $set: {
        paid: true,
        transactionId:payment.transactionId

      }
    }
    const result = await paymentCollection.insertOne(payment);
    const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
    res.send(updatedDoc);
  })


// show all user for make addmin deshboard
app.get('/user',verifyJWT,async(req, res) => {
  const users = await userCollection.find().toArray();
  res.send(users);
})
// end user 
// show user find with email start
app.get('/users', async(req,res) => {
  const email = req.query.email;
  const query = {email:email};
  const orders = await userCollection.find(query).toArray();
  res.send(orders);
})
// show user find with email end

// make addmin start 

app.put('/user/admin/:email',verifyJWT,async(req,res) => {
  const email = req.params.email;
  const filter = {email:email};
  const updateDoc = {
    $set: {role: 'admin'},
  };
  const result = await userCollection.updateOne(filter,updateDoc);
  res.send(result);
})
  
// make addmin end 

//  addmin can make a adimn 
app.put('/user/admin/:email', verifyJWT, async (req, res) => {
  const email = req.params.email;
  const requester = req.decoded.email;
  const requesterAccount = await userCollection.findOne({ email: requester });
  if (requesterAccount.role === 'admin') {
    const filter = { email: email };
    const updateDoc = {
      $set: { role: 'admin' },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  }
  else{
    res.status(403).send({message: 'forbidden'});
  }

})
// admin can make admin end 
// verifyadmin start 
app.get('/admin/:email', async(req, res) =>{
  const email = req.params.email;
  const user = await userCollection.findOne({email: email});
  const isAdmin = user.role === 'admin';
  res.send({admin: isAdmin})
})
// end admin verifyadmin 

// add reveiw start 
app.post('/review', async(req,res) => {
  const reviews = req.body;
  const result = await reviewCollection.insertOne(reviews);
  res.send(result);
})
// add reveiw end 
// show all reveiw
app.get('/reviews',async(req, res) => {
  const review = await reviewCollection.find().toArray();
  res.send(review);
})
// end reveiw

}
finally{

}



}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World MANUFACTURER!')
})

app.listen(port, () => {
  console.log(`MANUFACTURER listening on port ${port}`)
})