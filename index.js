const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

// Middleware options
const corsOptions = {
  origin: [
    // "http://localhost:5173",
    // "http://localhost:5174",
    // "https://vote.niva.now",
    // process.env.CLIENT_ADDRESS,
    // process.env.DEV_CLIENT,
    // /\.vercel\.app$/
    "*",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  withCredentials: true,
};

// middleware
// app.use(cors(corsOptions));
app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());


// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxvwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const userCollection = client.db("nahidasarwar").collection("users");
    const donationCollection = client.db("nahidasarwar").collection("donations");
    const videoCollection = client.db("nahidasarwar").collection("videos");
    const feedbackCollection = client.db("nahidasarwar").collection("feedbacks");
    const statsCollection = client.db("nahidasarwar").collection("stats");

    // JWT related API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
      res.send({ token });
    });

    // Middleware for token verification
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Middleware for admin verification
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

    // User management APIs
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      const admin = user?.role === 'admin';
      res.send({ admin });
    });

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: { role: 'admin' } };
      const result = await userCollection.updateOne(filter, update);
      res.send(result);
    });

    app.put('/users/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const update = req.body;
      const result = await userCollection.updateOne({ email }, { $set: update });
      res.send(result);
    });


    // Donation submission
    app.post('/donations', async (req, res) => {
      try {
        const donation = req.body;
        const result = await donationCollection.insertOne(donation);
        res.send(result);
      } catch (error) {
        console.error("Donation submission error:", error);
        res.status(500).send({ message: "Failed to submit donation" });
      }
    });

    app.get('/donations', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await donationCollection.find().sort({ date: -1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching donations:", error);
        res.status(500).send({ message: "Failed to fetch donations" });
      }
    });

    app.delete('/donations/:id', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const result = await donationCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error("Error deleting donation:", error);
        res.status(500).send({ message: "Failed to delete donation" });
      }
    });

    app.patch('/donations/:id', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const id = req.params.id;
        const updateData = req.body;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: updateData
        };
        const result = await donationCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating donation:", error);
        res.status(500).send({ message: "Failed to update donation" });
      }
    });

    // Video management
    app.get('/videos', async (req, res) => {
      const result = await videoCollection.find().toArray();
      res.send(result);
    });

    app.post('/videos', verifyToken, verifyAdmin, async (req, res) => {
      const video = req.body;
      const result = await videoCollection.insertOne(video);
      res.send(result);
    });

    app.delete('/videos/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await videoCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch('/videos/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updateData };
      const result = await videoCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Feedback Management
    app.post('/feedbacks', async (req, res) => {
      const feedback = req.body;
      feedback.createdAt = new Date();
      // Default status to pending if not provided (for reviews merged into feedback)
      if (!feedback.status) feedback.status = 'pending';
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });

    app.get('/feedbacks', verifyToken, verifyAdmin, async (req, res) => {
      const result = await feedbackCollection.find().sort({ createdAt: -1 }).toArray();
      res.send(result);
    });

    // Get approved feedbacks only (for public display)
    app.get('/feedbacks/approved', async (req, res) => {
      const result = await feedbackCollection.find({ status: 'approved' }).sort({ createdAt: -1 }).toArray();
      res.send(result);
    });

    // Approve feedback
    app.patch('/feedbacks/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: status
        }
      };
      const result = await feedbackCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete('/feedbacks/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await feedbackCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // News Management
    const newsCollection = client.db("nahidasarwar").collection("news");

    app.get('/news', async (req, res) => {
      const result = await newsCollection.find().sort({ date: -1 }).toArray();
      res.send(result);
    });

    app.post('/news', verifyToken, verifyAdmin, async (req, res) => {
      const newsItem = req.body;
      const result = await newsCollection.insertOne(newsItem);
      res.send(result);
    });

    app.delete('/news/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await newsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch('/news/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updateData };
      const result = await newsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Stats Endpoint (Dashboard & Home)
    app.get('/stats', async (req, res) => {
      try {
        const stats = await statsCollection.findOne({});
        if (stats) {
          res.send(stats);
        } else {
          // Default fallback
          res.send({
            activeSupporters: 0,
            organizedCommunity: 0,
            raisedFunds: 0,
            totalSpent: 0,
            newsLink: "https://www.prothomalo.com/world"
          });
        }
      } catch (error) {
        console.error("Stats Fetch Error:", error);
        res.status(500).send({ message: "Failed to fetch stats" });
      }
    });

    // Expenses Management
    const expenseCollection = client.db("nahidasarwar").collection("expenses");

    app.get('/expenses', async (req, res) => {
      try {
        const result = await expenseCollection.find().sort({ date: -1 }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching expenses:", error);
        res.status(500).send({ message: "Failed to fetch expenses" });
      }
    });

    app.post('/expenses', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const expense = req.body;
        // Ensure proper types
        expense.amount = parseFloat(expense.amount);
        // If date provided, use it, else current date
        expense.date = expense.date ? new Date(expense.date) : new Date();

        const result = await expenseCollection.insertOne(expense);
        res.send(result);
      } catch (error) {
        console.error("Error adding expense:", error);
        res.status(500).send({ message: "Failed to add expense" });
      }
    });

    app.delete('/expenses/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const result = await expenseCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get('/expense-stats', async (req, res) => {
      try {
        // Calculate Total Raised from Donations
        // Convert strings to double if necessary (safe fallback)
        const donationStats = await donationCollection.aggregate([
          {
            $group: {
              _id: null,
              totalAmount: { $sum: { $toDouble: "$amount" } }
            }
          }
        ]).toArray();
        const totalRaised = donationStats.length > 0 ? donationStats[0].totalAmount : 0;

        // Calculate Total Spent from Expenses
        const expenseStats = await expenseCollection.aggregate([
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" }
            }
          }
        ]).toArray();
        const totalSpent = expenseStats.length > 0 ? expenseStats[0].totalAmount : 0;

        const currentBalance = totalRaised - totalSpent;

        res.send({
          totalRaised,
          totalSpent,
          currentBalance
        });
      } catch (error) {
        console.error("Expense Stats Error:", error);
        res.status(500).send({ message: "Failed to fetch expense stats" });
      }
    });

    // Update Stats (Admin only)
    app.post('/stats', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const stats = req.body;
        // Upsert logic: If 0 docs, insert. Else update first.
        const count = await statsCollection.countDocuments();
        if (count === 0) {
          const result = await statsCollection.insertOne(stats);
          res.send(result);
        } else {
          const result = await statsCollection.updateOne({}, { $set: stats });
          res.send(result);
        }
      } catch (error) {
        console.error("Stats Update Error:", error);
        res.status(500).send({ message: "Failed to update stats" });
      }
    });

    // review management
  } finally {
    // Do not close client if keeping server running
  }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('FOXMEN STUDIO is sitting');
});

// Start server
app.listen(port, () => {
  console.log(`FOXMEN STUDIO is sitting on port ${port}`);
});