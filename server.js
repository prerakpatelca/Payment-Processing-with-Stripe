// Source used for reference files provided by Professor, Twilio Documentation and Stripe Documentation
/* "StAuth10065: I Prerak Patel, 000825410 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else." */

const express = require('express');
const session = require('express-session')
const mustacheExpress = require('mustache-express');
var fs = require('fs');
var file = "api.db";
var fileexists = fs.existsSync(file);
const app = express();

var socketIO = require('socket.io');
var http = require('http');
var server = http.Server(app);
var io = socketIO(server);

var stripe = require("stripe")("sk_test_51Hj6UrHDFsCXlLlmavxPEV2aw1vvOHiO1dQs0yTMHoANHG99JZe3ZnNzUWVcPnGrOQ31RlorKTcTf7RQ9VaKj4DS00e8FBO4UA");

app.engine("mustache", mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

app.set('port', 3000);
app.use(express.static(__dirname + '/views'));

if (!fileexists) {
    console.log('Creating DB file');
    fs.openSync(file, 'w');
}

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

const accountSid = 'AC9d1c29dca1529b50041db58911e39250';
const authToken = 'e46e708a276f0e4a1149d53c16a754b7';
const client = require('twilio')(accountSid, authToken);

db.serialize(function() {
    if (!fileexists) {
        console.log("Creating table");
        db.run('CREATE TABLE customers (customerID text, subscripitionID text, fullname text, email text, password text, birthdate date, phone text)');
        db.run(`INSERT INTO customers (customerID, subscripitionID, fullname, email, password, birthdate, phone) VALUES("","", "administrator", "admin@app.com","admin","2020-10-30","1800800999");`);
    }
});


app.get("/app", function(req, res) {
    res.render("home");
});

app.get("/login", function(req, res) {
    loginerror = req.session.login_error;
    req.session.login_error = "";

    if (!req.session.user) {
        res.render("loginpage", { errormsg: loginerror });
    } else {
        res.redirect("/customer");
    }
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.post('/attemptlogin', function(req, res) {
    db.all("SELECT * FROM customers", (err, row) => {
        if (err) {
            res.send(err.message);
        }
        var lengthCounter = 1;

        row.forEach((element) => {
            if (req.body.email == element.email && req.body.password == element.password) {
                req.session.user = element;
                if (element.fullname == 'administrator') {
                    res.redirect("/admin");
                    return;
                } else {

                    res.redirect("/customer");
                    return;
                }
            } else {
                if (lengthCounter == row.length) {
                    req.session.login_error = "Invalid username and/or password! Please try again!!";
                    res.redirect("/login");
                    return;
                }
            }
            lengthCounter += 1;
        });
    });

});

io.on('connection', function(socket) {
    socket.on('get code', function(data) {
        var code = Math.floor(Math.random() * 900000) + 99999;
        client.messages
            .create({
                body: 'Your Lab5 verification code is: ' + code,
                from: '+12055764436',
                to: '+1' + data
            })
            .then(message => console.log(message.sid))
            .done();

        io.emit("sentCode", code);
    });
});

app.post('/storeregister', function(req, res) {
    var newuser = {
        fullname: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        birthdate: req.body.birthdate,
        phone: req.body.phone
    };
    req.session.newuser = newuser
    return res.redirect("/otp");

});

app.get('/otp', function(req, res) {
    return res.render("otp", req.session.newuser);
});

app.get('/attemptregister', function(req, res) {
    var registeruser = req.session.newuser;
    db.serialize(function() {
        console.log("Inserting table");
        db.run(`INSERT INTO customers (customerID, subscripitionID, fullname, email, password, birthdate, phone) VALUES("${req.session.customerID}","${req.session.subscriptionsID}", "${registeruser.fullname}", "${registeruser.email}","${registeruser.password}","${registeruser.birthdate}","${registeruser.phone}");`);
    });
    var currentuser = {
        customerID: req.session.customerID,
        subscripitionID: req.session.subscriptionsID,
        fullname: registeruser.fullname,
        email: registeruser.email,
        password: registeruser.password,
        birthdate: registeruser.birthdate,
        phone: registeruser.phone
    };
    req.session.user = currentuser;
    return res.redirect("/customer");

});

app.get("/admin", function(req, res) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        var lengthCounter = 1;
        db.all("SELECT * FROM customers WHERE NOT (fullname = 'administrator')", (err, row) => {
            if (err) {
                res.send(err.message);
            }
            var norows = false;
            var showrows = false;
            if (row.length == 0) {
                norows = true;
                res.render("adminpage", { norows, showrows });
            } else {
                showrows = true;
                row.forEach((element) => {
                    stripe.subscriptions.retrieve(
                        element.subscripitionID
                    ).then(subscription => {
                        stripe.products.retrieve(
                            subscription.plan.product
                        ).then((product) => {
                            element.subscription = product.name;
                        }).then(() => {
                            if (lengthCounter == row.length) {
                                res.render("adminpage", { customers: row, norows, showrows });
                            } else {
                                lengthCounter += 1;
                            }
                        })
                    });
                });
            }
        });

    }
})

app.get("/customer", function(req, res) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        stripe.subscriptions.retrieve(
            req.session.user.subscripitionID
        ).then(subscription => {
            stripe.products.retrieve(
                subscription.plan.product
            ).then((product) => {
                return new Promise(function(resolve) {
                    try {
                        db.all(`SELECT * FROM customers WHERE customerID = "${req.session.user.customerID}"`, (err, row) => {
                            req.session.user = row[0];
                            res.render("customer", { user: req.session.user, subscription: product.name });
                        });
                    } catch (error) {
                        console.error(error);
                    }
                });
            });
        });
    }
});

app.post("/updateCustomer", function(req, res) {
    new Promise(function(resolve) {
        try {
            db.run(`UPDATE customers SET password = "${req.body.password}", birthdate = "${req.body.birthdate}", phone = "${req.body.phone}" WHERE customerID = "${req.body.customerID}"`);
        } catch (error) {
            console.error(error);
        }
    });
    res.redirect('/customer');
});

app.post('/sendUpdate', function(req, res) {
    req.session.customer = req.body.customer;
    req.session.subscription = req.body.subscription;
    res.redirect('/update');
});

app.get('/update', function(req, res) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        var subscripitionID;
        var admin = false;
        var member = false;
        if (req.session.user.fullname == "administrator") {
            subscripitionID = req.session.subscription;
            admin = true;
        } else {
            subscripitionID = req.session.user.subscripitionID;
            member = true;
        }
        var basic = true;
        var plus = true;
        var advanced = true;
        var addMsg = "";
        updateMsg = req.session.update;
        req.session.update = "";
        stripe.subscriptions.retrieve(
            subscripitionID
        ).then(subscription => {
            stripe.products.retrieve(
                subscription.plan.product
            ).then((product) => {
                if (product.name == "Basic") {
                    basic = false;
                    addMsg = "Basic";
                } else if (product.name == "Plus") {
                    plus = false;
                    addMsg = "Plus";
                } else if (product.name == "Advanced") {
                    advanced = false;
                    addMsg = "Advanced";
                }
                if (!updateMsg) {
                    updateMsg = "Current Subscription is " + addMsg;
                }
            }).then(() => {
                res.render("updatesubscription", { basic, plus, advanced, msg: updateMsg, admin, member });
            });
        });
    }
});

app.post('/update', function(req, res) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        if (req.session.user.fullname == "administrator") {
            subscripitionID = req.session.subscription;
        } else {
            subscripitionID = req.session.user.subscripitionID
        }
        stripe.subscriptions.retrieve(
            subscripitionID
        ).then(subscription => {
            stripe.subscriptions.update(
                subscripitionID, {
                    proration_behavior: 'create_prorations',
                    items: [{
                        id: subscription.items.data[0].id,
                        price: req.body.subscription,
                    }]
                }
            );
        });
        req.session.update = "Updated subscription successfully - Refresh the page";
        res.redirect("/update");
    }
});

app.post('/delete', function(req, res) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        stripe.subscriptions.del(
            req.session.user.subscripitionID
        ).then(() => {
            db.run(`DELETE FROM customers WHERE customerID = "${req.session.user.customerID}"`);
            delete(req.session.user);
            res.redirect("/login");
        });
    }
});

app.post('/customerDelete', function(req, res) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        stripe.subscriptions.del(
            req.body.subscription
        ).then(() => {
            db.run(`DELETE FROM customers WHERE customerID = "${req.body.customer}"`);
            res.redirect("/admin");
        });
    }
});

app.get('/logout', function(req, res) {
    delete(req.session.user);
    res.redirect("/login");
});

app.get('/subscriptionregister', function(req, res) {

    return Promise.all([stripe.plans.list({}), stripe.products.list({})])
        .then(listdata => {
            var plans = listdata[0].data;
            var products = listdata[1].data;
            plans = plans.map(eachPlan => {
                amount = `$${(eachPlan.amount / 100)}`
                return {...eachPlan, amount };
            });

            products.forEach(product => {
                const getPlans = plans.filter(plan => {
                    return plan.product === product.id;
                });

                product.plans = getPlans;
            });

            return res.render("subscription", { products: products });
        });
});

app.post('/takePayment', (req, res) => {
    var plan = {
        id: req.body.subscriptionId,
        amount: req.body.subscriptionAmount,
        name: req.body.subscriptionName,
        interval: req.body.subscriptionInterval,
        interval_count: req.body.subscriptionIntervalCount
    }

    res.render('takepayment', plan);
});

app.post('/processPayment', (req, res) => {
    var customer = stripe.customers.create({
        source: req.body.stripeToken,
        email: req.body.customerEmail
    });

    customer.then(customer => {
        req.session.customerID = customer.id;
        stripe.subscriptions.create({
            customer: customer.id,
            items: [{
                plan: req.body.subscriptionId
            }]
        }).then(subscription => {
            req.session.subscriptionsID = subscription.id;
        }).then(() => {
            return res.redirect('attemptregister');
        }).catch(err => {
            console.log(err);
            return res.redirect('subscriptionregister');
        });
    });
});

server.listen(3000, function() {
    console.log("Server listening...");
});