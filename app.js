const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

app.post("/register", async (request, response) => {
  const userDetails = request.body;

  const { username, name, password, gender, location } = userDetails;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `select * from user where username = '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const postUserDetailsQuery = `INSERT INTO 
                                            user(username,name,password,gender,location)
                                        VALUES ('${username}','${name}','${hashedPassword}','${gender}','${location}') ;`;
      await db.run(postUserDetailsQuery);
      response.send("User created successfully");
      response.status(200);
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `select * from user where username = '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const selectUserQuery = `select * from user where username = '${username}';`;

  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.send("Invalid User");
    response.status(400);
  } else {
    const isPasswordMatched = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );

    if (isPasswordMatched === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const updateUserDetailsQuery = `UPDATE user SET 
                                            password = "${hashedPassword}"
                                            WHERE username = "${username}" ;`;
        await db.run(updateUserDetailsQuery);
        response.send("Password updated");
        response.status(200);
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
