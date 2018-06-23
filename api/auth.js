const config    = require('../config/conf.server');
const db        = require('./db');
const kryptos   = require('./kryptos');
const express   = require('express');
const router    = express.Router();

function auth(req, res) {
    return new Promise((resolve, reject) => {
        var token = req.get('Authorization');
        var decrypted = kryptos.decryptAccessToken(token);
        if(!decrypted) { reject({req, res}); return; } 
        var { name, pass, iat } = decrypted;
        var email = name;
        db  .getUserdata(email)
            .then(data => {
                var encrypted = kryptos.encryptPasswordMD5(pass);
                var inDb = data.md5;
                if(encrypted === inDb) {
                    resolve({req, res});
                } else {
                    reject({req, res});
                    return;
                }
            })
            .catch(err => {
                reject({req, res});
                return;
            })
    })
}

function fakeAuth(req, res) {
    return new Promise((resolve, reject) => {
        resolve({req, res});
        return;
    });
}

// Direct password authentication
// Response an access token if succeed
// The client side should return a promise of token
router.post('/:email', (req, res) => {
    var email   = req.params['email'];
    var md5     = req.body[0];

    db  .getUserdata(email)
        .then(data => {
            var encrypted = kryptos.encryptPasswordMD5(md5);
            var inDb = data.md5;
            if(encrypted === inDb)
                res.json({
                    email,
                    token: kryptos.encryptAccessToken(email, md5)
                });
            else res.status(204).end();
        })
        .catch(err => {res.status(500).end(); console.log(err);});
});

// This test the user existance
router.get('/:email', (req, res) => {
    var email   = req.params['email'];

    db  .getUserdata(email)
        .then(data => {
            if(data) res.status(200).end();
            else res.status(204).end();
        })
        .catch(() => {
            res.status(204).end();
        });
})

router.post('/:email/newpass', (req, res) => {
    auth(req, res).then(x => {let {req, res} = x;
        var email   = req.params['email'];
        var md5     = req.body[0];

        db  .getUserdata(email)
            .then(() => {
                db  .updateUser(email, { md5: kryptos.encryptPasswordMD5(md5) })
                    .then(() => res.status(200).end())
                    .catch( err => { res.status(500).end(); console.log(err); } );
            })
            .catch(err => {res.status(500).end(); console.log(err);});
    })
    .catch(x => { res.status(500).end(); console.log(x); });
});

if(config.auth) router.auth = auth;
else router.auth = fakeAuth;

module.exports = router;