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