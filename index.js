const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
//mongodb connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zjyxp.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
// console.log(uri)

//basic server
const port = process.env.PORT || 4002;
app.use(cors());
app.use(express.json());

/// USE JWT TOKEN
//doctor-portals-firebase-adminsdk.json
const admin = require("firebase-admin");

const serviceAccount = require('./doctor-portals-firebase-adminsdk.json');
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
//VERIFY THE TOKEN
async function verifyToken(req, res, next) {
  if (req?.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    // console.log(token)
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }

  next();
}
// run function for use mongo server
async function run() {
  try {
    await client.connect();
    // console.log('database connected')
    const database = client.db("doctors_portals");
    const appointmentCollection = database.collection("appointments");
    const usersCollection = database.collection("users");

    // POST API FOR APPOINTMENT
    app.post("/appointments", async (req, res) => {
      // console.log('i am from appointment post')
      const appointment = req.body;
      // console.log(appointment)

      const result = await appointmentCollection.insertOne(appointment);

      res.json(result);
    });
    ///GET APPOINTMENT FOR SPECIFIC USER///
    app.get("/appointments", async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date };
      // console.log(date)
      const cursor = appointmentCollection.find(query);
      const appointments = await cursor.toArray();
      res.json(appointments);
    });

    /// POST FOR CREATE USER FORM FIREBASE
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user)
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    // PUT FOR UPDATE USER DATA
    app.put("/users", async (req, res) => {
      const user = req.body;
      // console.log('i am from put',user)
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
    //  MAKE ADMIN FOR USERS/ADMIN
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      console.log("put", req.decodedEmail);
      const requester = req.decodedEmail;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        const filter = { email: user.email };
        const updateDoc = { $set: { role: "admin" } };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result);
      }
      else{
          res.status(401).json({massage: 'You do not have access to making admin'})
      }
    });
    //GET PERFECT ADMIN USING GET METHOD
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`<h1>hello i am doctor portal server!!!</h1>`);
});

app.listen(port, () => {
  console.log(`server running in port number ${port}`);
});
