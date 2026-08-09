const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDB() {
  const uri = process.env.DATABASE_URL;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    
    // List databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    const saathiDbExists = dbs.databases.find(db => db.name === 'saathi');
    console.log("Database 'saathi' exists:", !!saathiDbExists);

    if (saathiDbExists) {
      const db = client.db('saathi');
      const collections = await db.listCollections().toArray();
      console.log("Collections in 'saathi':", collections.map(c => c.name));

      if (collections.some(c => c.name === 'User')) {
        const usersCount = await db.collection('User').countDocuments();
        console.log("Number of documents in 'User' collection:", usersCount);
        const users = await db.collection('User').find().toArray();
        console.log("Users:", users.map(u => ({ id: u._id, email: u.email, name: u.name })));
      } else {
        console.log("Collection 'User' does not exist.");
      }
    }
  } catch (err) {
    console.error("Error connecting:", err.message);
  } finally {
    await client.close();
  }
}

checkDB();
