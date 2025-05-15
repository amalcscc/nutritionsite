const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, './server/database.sqlite'));

// Array of sample patients data
const patients = [
  {
    name: 'Jean Dupont',
    age: 45,
    sex: 'M',
    phone: '0712345678',
    weight: 82.5,
    height: 178,
    archived: 0
  },
  {
    name: 'Marie Lambert',
    age: 32,
    sex: 'F',
    phone: '0687654321',
    weight: 65.7,
    height: 162,
    archived: 0
  },
  {
    name: 'Philippe Martin',
    age: 58,
    sex: 'M',
    phone: '0698765432',
    weight: 91.2,
    height: 182,
    archived: 0
  },
  {
    name: 'Sophie Dubois',
    age: 27,
    sex: 'F',
    phone: '0612345987',
    weight: 55.3,
    height: 165,
    archived: 1
  },
  {
    name: 'Lucas Moreau',
    age: 38,
    sex: 'M',
    phone: '0723456789',
    weight: 75.8,
    height: 175,
    archived: 1
  }
];

// Function to insert a patient
function insertPatient(patient) {
  return new Promise((resolve, reject) => {
    const { name, age, sex, phone, weight, height, archived } = patient;
    db.run(
      `INSERT INTO patients (name, age, sex, phone, weight, height, archived) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, age, sex, phone, weight, height, archived],
      function(err) {
        if (err) {
          console.error('Error inserting patient:', err);
          reject(err);
        } else {
          console.log(`Patient ${name} inserted with id ${this.lastID}`);
          resolve(this.lastID);
        }
      }
    );
  });
}

// Insert all patients
async function insertAllPatients() {
  try {
    for (const patient of patients) {
      await insertPatient(patient);
    }
    console.log('All patients inserted successfully!');
    db.close();
  } catch (error) {
    console.error('Error inserting patients:', error);
    db.close();
  }
}

insertAllPatients(); 