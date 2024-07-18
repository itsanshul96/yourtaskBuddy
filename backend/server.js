const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const http = require('http');
const initializeSocket = require('./socketServer'); // Import the socket server

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server); // Initialize the socket server

const PORT = 3000;
let helpRequests = [];
// let onlineUsers = new Set(); // To track online users

// MySQL connection pool setup
const pool = mysql.createPool({
    host: 'db4free.net',
    user: 'daily_news',
    password: 'Anshul@963258',
    database: 'dailynewsdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 35000
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Middleware to protect routes
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        app.use(express.static(path.join(__dirname, '..', 'frontend')));
        return next();
    } else {
        res.redirect('/login.html');
    }
}

// Check if user is not logged in yet, then directly redirect to the login page and do not allow access to the paths below
app.use(['/index.html', '/manager-view.html', '/myTodoTask.html', '/deleteUserAccount.html'], isAuthenticated);

// Login Route
app.post('/login', (req, res) => {
    const {
        username,
        password
    } = req.body;
    const query = 'SELECT * FROM users WHERE username = ?';
    pool.query(query, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const user = results[0];
            if (bcrypt.compareSync(password, user.password)) {
                req.session.user = user.id;
                res.send({
                    message: 'Login successful'
                });
            } else {
                res.status(401).send({
                    message: 'Invalid username or password'
                });
            }
        } else {
            res.status(401).send({
                message: 'Invalid username or password'
            });
        }
    });
});

// Register Route
app.post('/register', (req, res) => {
    const {
        username,
        password,
        teamName
    } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    pool.query(checkUserQuery, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.status(400).send({
                message: 'User already exists'
            });
        } else {
            const insertUserQuery = 'INSERT INTO users (username, password, teamName) VALUES (?, ?, ?)';
            pool.query(insertUserQuery, [username, hashedPassword, teamName], (err) => {
                if (err) throw err;
                res.send({
                    message: 'User registered successfully'
                });
            });
        }
    });
});

// Forgot Password Route
app.post('/forgot-password', (req, res) => {
    const {
        username,
        newPassword
    } = req.body;
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const query = 'SELECT * FROM users WHERE username = ?';
    pool.query(query, [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const updateQuery = 'UPDATE users SET password = ? WHERE username = ?';
            pool.query(updateQuery, [hashedPassword, username], (err) => {
                if (err) throw err;
                res.send({
                    message: 'Password reset successful'
                });
            });
        } else {
            res.status(404).send({
                message: 'Username not found'
            });
        }
    });
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send({
        message: 'Logout successful'
    });
});

// Endpoint for team members to update their status and add to-do items
app.post('/update-status', isAuthenticated, (req, res) => {
    const {
        status,
        ticketsCount,
        toDoList
    } = req.body;
    const userId = req.session.user;

    if (status) {
        const checkStatusQuery = 'SELECT * FROM team_status WHERE user_id = ?';
        pool.query(checkStatusQuery, [userId], (err, results) => {
            if (err) return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });

            if (results.length > 0) {
                const updateStatusQuery = 'UPDATE team_status SET status = ?, tickets_count = ? WHERE user_id = ?';
                pool.query(updateStatusQuery, [status, ticketsCount, userId], (err) => {
                    if (err) return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                    res.json({
                        success: true,
                        message: 'Status updated successfully'
                    });
                });
            } else {
                const insertStatusQuery = 'INSERT INTO team_status (user_id, status, tickets_count) VALUES (?, ?, ?)';
                pool.query(insertStatusQuery, [userId, status, ticketsCount], (err) => {
                    if (err) return res.status(500).json({
                        success: false,
                        message: 'Internal server error'
                    });
                    res.json({
                        success: true,
                        message: 'Status updated successfully'
                    });
                });
            }
        });
    }

    if (toDoList) {
        const insertToDoQuery = 'INSERT INTO todos (user_id, task, done) VALUES (?, ?, FALSE)';
        pool.query(insertToDoQuery, [userId, toDoList], (err) => {
            if (err) return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
            res.json({
                success: true,
                message: 'To-do added successfully'
            });
        });
    }
});

// Endpoint to get all to-do lists
app.get('/all-todos', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getToDosQuery = 'SELECT * FROM todos WHERE user_id = ?';
    pool.query(getToDosQuery, [userId], (err, results) => {
        if (err) throw err;
        res.json({
            [userId]: results
        });
    });
});

// Endpoint to get a user's to-do list
app.get('/get-todo', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getToDosQuery = 'SELECT * FROM todos WHERE user_id = ?';
    pool.query(getToDosQuery, [userId], (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Endpoint to edit a user's to-do item
app.post('/edit-todo', isAuthenticated, (req, res) => {
    const {
        oldToDo,
        newToDo
    } = req.body;
    const userId = req.session.user;
    const updateToDoQuery = 'UPDATE todos SET task = ? WHERE user_id = ? AND task = ?';
    pool.query(updateToDoQuery, [newToDo, userId, oldToDo], (err, results) => {
        if (err) throw err;
        res.send('To-do edited successfully');
    });
});

// Endpoint to delete a user's to-do item
app.delete('/delete-todo', isAuthenticated, (req, res) => {
    const {
        toDo
    } = req.body;
    const userId = req.session.user;
    const deleteToDoQuery = 'DELETE FROM todos WHERE user_id = ? AND task = ?';
    pool.query(deleteToDoQuery, [userId, toDo], (err, results) => {
        if (err) throw err;
        res.send('To-do deleted successfully');
    });
});

// Endpoint to mark a to-do item as done
app.post('/mark-done', isAuthenticated, (req, res) => {
    const {
        toDo
    } = req.body;
    const userId = req.session.user;
    const markDoneQuery = 'UPDATE todos SET done = TRUE, completed_at = NOW() WHERE user_id = ? AND task = ?';
    pool.query(markDoneQuery, [userId, toDo], (err, results) => {
        if (err) throw err;
        res.send('To-do marked as done');
    });
});

// Endpoint to delete a user's status and to-do list
app.delete('/delete-user/:userId', isAuthenticated, (req, res) => {
    const userId = req.params.userId;
    const {
        pathname
    } = req.query;
    let user_id;

    const getTeamStatusQuery = `
        SELECT users.id, users.username, team_status.status, team_status.tickets_count 
        FROM team_status
        JOIN users ON team_status.user_id = users.id
    `;
    pool.query(getTeamStatusQuery, (err, results) => {
        if (err) {
            console.error('Error fetching team status:', err);
            return res.status(500).json({
                error: 'Internal server error'
            });
        }
        results.forEach(function (userData) {
            if (userData.username == userId) {
                user_id = userData.id;
            }
        });

        if (pathname === "/manager-view.html") {
            console.log('user_id', user_id);
            setTimeout(() => {
                const deleteStatusQuery = 'DELETE FROM team_status WHERE user_id = ?';
                pool.query(deleteStatusQuery, [user_id], (err) => {
                    if (err) throw err;
                });
            }, 1000);
        }

        if (pathname === "/myTodoTask.html" || pathname === "/deleteUserAccount.html") {
            const deleteToDosQuery = 'DELETE FROM todos WHERE done = 0 and user_id = ?';
            pool.query(deleteToDosQuery, [userId], (err) => {
                if (err) throw err;
            });
        }

        if (pathname === "/deleteUserAccount.html") {
            const deleteUserQuery = 'DELETE FROM users WHERE username = ?';
            pool.query(deleteUserQuery, [userId], (err) => {
                if (err) throw err;
            });
        }

        res.send(`User ${userId} and their to-do list deleted successfully`);
    });
});

// Endpoint for manager to get team status
app.get('/team-status', isAuthenticated, (req, res) => {
    const getTeamStatusQuery = `
        SELECT users.username, users.teamName, team_status.status, team_status.tickets_count 
        FROM team_status
        JOIN users ON team_status.user_id = users.id
    `;
    pool.query(getTeamStatusQuery, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});
//getting all user to display on frontend
app.get("/all-users", isAuthenticated, (req, res) => {
    const allUserQuery = 'select * from users';
    pool.query(allUserQuery, (err, results) => {
        if (err) throw err;
        res.json({
            "allUserData": results
        });
    })
});

// Endpoint to get the logged-in user's username
app.get('/get-user', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const getUserQuery = 'SELECT username, id, teamName FROM users WHERE id = ?';
    const allUserExceptLoggedOne = 'SELECT username FROM users';
    pool.query(getUserQuery, [userId], (err, results) => {
        if (err) throw err;

        pool.query(allUserExceptLoggedOne, (err, otherUsersResults) => {
            if (err) {
                res.status(500).json({
                    error: 'Database error'
                });
                throw err;
            }

            const otherUsernames = otherUsersResults.map(user => user.username);
            res.json({
                username: results[0].username,
                id: results[0].id,
                teamName: results[0].teamName,
                allOtherUser: otherUsernames
            });
        });

    });
});

// Serve login.html without authentication
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
});

// Root route
app.get('/', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    } else {
        res.redirect('/login.html');
    }
});

// Endpoint to request help
app.post('/request-help', isAuthenticated, (req, res) => {
    const userId = req.body.userId;
    // Add the help request to the array
    helpRequests.push({
        userId,
        timestamp: new Date()
    });
    res.send({
        message: 'Help request sent successfully'
    });
});

// Endpoint to check help requests
app.get('/check-help-requests', isAuthenticated, (req, res) => {
    // Query to get team status data from the database
    const getTeamStatusQuery = `
        SELECT users.id, users.username, team_status.status, team_status.tickets_count 
        FROM team_status
        JOIN users ON team_status.user_id = users.id
    `;
    pool.query(getTeamStatusQuery, (err, results) => {
        if (err) {
            console.error('Error fetching team status:', err);
            return res.status(500).json({
                error: 'Internal server error'
            });
        }

        // Filter available users based on status
        const availableUsers = results.filter(member =>
            member.status !== 'Fully Occupied' && member.status !== 'Over loaded for the day, looking for help'
        );

        // Check if the current user is in the list of available users
        const currentUser = availableUsers.find(user => user.id === req.session.user);

        if (currentUser) {
            // Send actual help requests if the current user is available
            res.json({
                helpRequests
            });
        } else {
            // Send an empty array if the current user is not available
            res.json({
                helpRequests: []
            });
        }
    });
});

// Endpoint to accept help request
app.post('/accept-help', isAuthenticated, (req, res) => {
    const {
        helperId,
        userId
    } = req.body;
    const index = helpRequests.findIndex(request => request.userId === userId);
    if (index !== -1) {
        helpRequests.splice(index, 1);

        // Emit event to notify the requester
        io.to(userId).emit('helpAccepted', {
            helperId
        });

        res.send({
            message: 'Help request accepted'
        });
    } else {
        res.status(400).send({
            message: 'Help request not found'
        });
    }
});

// Endpoint to get completed tasks
app.get('/completed-todos', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 15;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    let queryParams = [userId, limit, page * limit];
    let dateFilter = '';

    if (dateFrom && dateTo) {
        dateFilter = ' AND completed_at BETWEEN ? AND ?';
        queryParams = [userId, dateFrom, dateTo, limit, page * limit];
    } else if (dateFrom) {
        dateFilter = ' AND completed_at >= ?';
        queryParams = [userId, dateFrom, limit, page * limit];
    } else if (dateTo) {
        dateFilter = ' AND completed_at <= ?';
        queryParams = [userId, dateTo, limit, page * limit];
    }

    const getCompletedToDosQuery = `SELECT * FROM todos WHERE user_id = ? AND done = TRUE ${dateFilter} ORDER BY completed_at DESC LIMIT ? OFFSET ?`;
    pool.query(getCompletedToDosQuery, queryParams, (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

// Endpoint to download completed tasks as CSV
app.get('/download-completed-tasks', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    let queryParams = [userId];
    let dateFilter = '';

    if (dateFrom && dateTo) {
        dateFilter = ' AND completed_at BETWEEN ? AND ?';
        queryParams = [userId, dateFrom, dateTo];
    } else if (dateFrom) {
        dateFilter = ' AND completed_at >= ?';
        queryParams = [userId, dateFrom];
    } else if (dateTo) {
        dateFilter = ' AND completed_at <= ?';
        queryParams = [userId, dateTo];
    }

    const getCompletedToDosQuery = `SELECT task, completed_at FROM todos WHERE user_id = ? AND done = TRUE ${dateFilter} ORDER BY completed_at DESC`;
    pool.query(getCompletedToDosQuery, queryParams, (err, results) => {
        if (err) throw err;
        const fields = ['task', 'completed_at'];
        const json2csvParser = new Parser({
            fields
        });
        const csv = json2csvParser.parse(results);
        res.header('Content-Type', 'text/csv');
        res.attachment('completed_tasks.csv');
        res.send(csv);
    });
});

// Route to fetch team members
app.get('/team-members', isAuthenticated, (req, res) => {
    const userId = req.session.user;
    const query = 'SELECT teamName FROM users WHERE id = ?';
    pool.query(query, [userId], (err, results) => {
        if (err) {
            res.status(500).send({
                error: 'Database error'
            });
            return;
        }
        const teamName = results[0].teamName;
        const teamMembersQuery = 'SELECT id, username FROM users WHERE teamName = ? AND id != ?';
        pool.query(teamMembersQuery, [teamName, userId], (err, members) => {
            if (err) {
                res.status(500).send({
                    error: 'Database error'
                });
                return;
            }
            res.json(members);
        });
    });
});

// Route to add a collaborator to a task
app.post('/add-collaborator', isAuthenticated, (req, res) => {
    const {
        task,
        collaboratorId
    } = req.body;
    const userId = req.session.user;

    // Insert the task for the collaborator
    const insertTaskQuery = 'INSERT INTO todos (user_id, task, done) VALUES (?, ?, FALSE)';
    pool.query(insertTaskQuery, [collaboratorId, task], (err) => {
        if (err) {
            res.status(500).send({
                error: 'Database error'
            });
            return;
        }

        // Add collaborator info to the original task (if necessary)
        const updateTaskQuery = 'UPDATE todos SET collaborator_id = ? WHERE user_id = ? AND task = ?';
        pool.query(updateTaskQuery, [collaboratorId, userId, task], (err) => {
            if (err) {
                res.status(500).send({
                    error: 'Database error'
                });
                return;
            }
            res.send({
                success: true,
                message: 'Collaborator added successfully'
            });
        });
    });
});
app.get('/all-teams', isAuthenticated, (req, res) => {
    const getAllTeamsQuery = 'SELECT DISTINCT teamName FROM users';
    pool.query(getAllTeamsQuery, (err, results) => {
        if (err) {
            res.status(500).send({
                error: 'Database error'
            });
            return;
        }
        res.json(results);
    });
});


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});