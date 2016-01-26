//PRIVATE COLLECTIONS ONLY ON SERVER
Log = new Mongo.Collection("log");

//COLLECTIONS TO BE PUBLISHED TO CLIENT
Classes = new Meteor.Collection("classes");
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

//COLLECTIONS being published to client
//only publishing that which is relevant to the 
//class being accessed, hiding user info everyone
//shouldn't have.
Meteor.publish("classes", function () {
    return Classes.find({});
});
Meteor.publish("errors", function (classtitle) {
    check(classtitle,String);
    var error_entries = Errors.find({"class":classtitle},{fields: {
        'owner': 0,
        'createdAt': 0,
    }});
    if (error_entries) {return error_entries}
    return this.ready();
});
Meteor.publish("hints", function (classtitle) {
    check(classtitle,String);
    var hint_entries = Hints.find({"class":classtitle},{fields: {
        'owner': 0,
        'createdAt': 0,
    }});
    if (hint_entries) {return hint_entries}
    return this.ready();
});

//PASSWORD FOR STUDENT ID AUTHENTICATED USERS
var edxpass = '071a0f58e44494a90dbc5844c480586c';

requested = function(errorId) {
    var requestedErrors = Meteor.user().profile['requestedErrors'];
    console.log('requestedErrors',requestedErrors)
    console.log('errorId',errorId)
    if (requestedErrors.indexOf(errorId) >= 0) {
        return true;
    } else {
        return false;
    }
    
};
upvoted = function(hintId) {
    var upvotedHints = Meteor.user().profile['upvotedHints'];
    console.log('upvotedHints',upvotedHints)
    console.log('hintId',hintId)
    if (upvotedHints.indexOf(hintId) >= 0) {
        return true;
    } else {
        return false;
    }
    
};

emailFollowers = function(errorId){
    //Meteor.users.find({}, {fields: {profile: 1}}).fetch()
    //Meteor.users().profile['requestedErrors'].indexOf(errorId) >= 0)
    var users = Meteor.users.find({}).fetch();
    users.forEach(function(elem){
        //console.log('elem',elem)
        if (elem.profile['requestedErrors']) {
            if (elem.profile['requestedErrors'].indexOf(errorId) >= 0){
                var error_entry = Errors.findOne({_id:errorId})
                var class_entry = Classes.findOne({classtitle:error_entry['class']})

                var route = '';
                var error_description = '';
                class_entry['errorCoords'].forEach(function(ec,ind){
                    route = route + '/' + encodeURIComponent(error_entry[ec['name']]);
                    error_description = error_description + ec['placeholder'] + ' ' + error_entry[ec['name']] + ' ';
                });

                var error_link = base_url + error_entry['class'] + route + '?student_id=' + encodeURIComponent(CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(elem.profile.email))) + '&source='+elem.profile.source;
                if (elem.profile.email){
                    Meteor.call('sendEmail',elem.profile.email,error_description,error_link);
                } else {
                    console.log('no email to send update to',elem)
                }
            }
        }
    });
}


Meteor.methods({

    addError: function(theclass,errorCoords) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        //todo: check if values are right type, within range, appropriate size #sanitization

        console.log('errorCoords',errorCoords)
        
        Object.keys(errorCoords).forEach(function(key, index) {
            console.log(key, errorCoords[key]);
            var value = errorCoords[key];

            //todo: check if its supposed to be an int or a string!

            if(typeof value === "string" && value.length > 50) {
               //it's a string but its too long
               throw new Meteor.Error('string-too-long'); 
               //todo: tell the user why its not getting added
            }
            if(typeof value === "int" && value.length > 4) {
               //it's a number but its too large or too many decimal places
               throw new Meteor.Error('int-too-big'); 
               //todo: tell the user why its not getting added
            }

            //     //checking input type and size
            // for (var errorCoord in classDict[classtitle]) {
            //     if (typeof userErrorCoords[errorCoord] !== classDict[classtitle][errorCoord]['type']){
            //         throw new Meteor.Error('not-the-right-type');
            //     }
            //     if (typeof userErrorCoords[errorCoord] === 'string' && userErrorCoords[errorCoord].length > 50) {
            //         throw new Meteor.Error('string-is-too-long'); 
            //     }
            //     if (typeof userErrorCoords[errorCoord] === 'number' && (userErrorCoords[errorCoord] > 10000 || userErrorCoords[errorCoord] < 0)) {
            //         throw new Meteor.Error('number-is-too-large-or-small'); 
            //     }
            // }


        });

        var candidateError = errorCoords; //{};

        candidateError['class'] = theclass;
        candidateError['requests'] = 0;
        candidateError['createdAt'] = new Date();
        candidateError['owner'] = Meteor.userId(); // _id of logged in user
        //candidateError['requesters'] = [];

        //Errors.insert(candidateError);

        Errors.insert(candidateError,function (err, result) {
            if (err) {console.log('problem adding errors')} 
            else {
                //logThis(classtitle,'addError',result);
                logObj = {};
                logObj['result'] = result;
                logObj['owner'] = candidateError['owner'];
                //logObj['username'] = Meteor.user().username;
                logObj['action'] = 'addError';
                logObj['object'] = candidateError;
                logObj['createdAt'] = candidateError['createdAt']
                logObj['class'] = candidateError['class'];
                Log.insert(logObj);

                //Meteor.user().profile['requestedErrors'].push(result);
                console.log(logObj)
                Meteor.call('toggleRequest', candidateError['class'], result);
                //return result
            }
        });

        
    },
    addHint: function (theclass,errorId,hintText) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }

        //todo: check if text is right type, appropriate size #sanitization
        if (typeof hintText !== 'string') {
            throw new Meteor.Error('hint-is-no-string')
        }
        if (typeof hintText === 'string' && hintText.length > 1000) {
            throw new Meteor.Error('string-too-long'); 
               //todo: tell the user why its not getting added
        }

        var hintObj = {};
        hintObj['hint'] = hintText;
        hintObj['errorId'] = errorId;
        hintObj['createdAt'] = new Date();
        hintObj['owner'] = Meteor.userId();
        //hintObj['username'] = Meteor.user().username;
        hintObj['class'] = theclass;
        hintObj['upvotes'] = 0;
        //hintObj['upvoters'] = [];


        //var insertedHint = Hints.insert(hintObj);
        Hints.insert(hintObj,function (err, result) {
            if (err) {console.log('problem adding hints')} 
            else {
                emailFollowers(errorId);
                //logThis(classtitle,'addHint',result);
                logObj = {};
                logObj['owner'] = hintObj['owner'];
                logObj['result'] = result;
                //logObj['username'] = Meteor.user().username;
                logObj['action'] = 'addHint';
                //logObj['object'] = insertedHint;
                logObj['createdAt'] = hintObj['createdAt']
                logObj['class'] = hintObj['class'];
                Log.insert(logObj);

                return result
            }
        });

        

    },
    toggleRequest: function (theclass,errorId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); //I think this is already handled on the client side? redundant there? or here?
        }
        else {

            var delta = 0;
            //var siteUser = user.user; //SiteUsers.findOne({ userId: Meteor.userId() });
            var requestedErrors = Meteor.user().profile['requestedErrors'];

            logObj = {};

            if (!requested(errorId)) {
                console.log('request this error:',errorId)
                delta = 1;
                logObj['action'] = 'request';
                //Meteor.user().profile['requestedErrors'].push(errorId);
                var updated_requestedErrors = requestedErrors.concat(errorId);
                //console.log()
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.requestedErrors": updated_requestedErrors }} );
                console.log('new user profile',Meteor.user().profile)
            } else {
                console.log('unrequest this error:',errorId)
                delta = -1;
                logObj['action'] = 'unrequest';
                //Meteor.user().profile['requestedErrors'] = _.without(requestedErrors,errorId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.requestedErrors": _.without(requestedErrors,errorId) }} );
                console.log('new user profile',Meteor.user().profile)
            }
            //Errors.update({ _id: errorId },{$inc: {requests: delta}});
            Errors.update({ _id: errorId },{$inc: {requests: delta}},function(err){
                if (err) {console.log('problem updating error follows')} 
                else {
                    //logThis(classtitle,action,errorId)
                    logObj['owner'] = Meteor.userId();
                    //logObj['username'] = Meteor.user().username;
                    logObj['object'] = errorId;
                    logObj['createdAt'] = new Date();
                    logObj['class'] = theclass;
                    Log.insert(logObj);
                }
            });

            
        }

    },
    toggleUpvote: function (theclass,hintId) {

        if (! Meteor.userId() ) {
            throw new Meteor.Error('not-authorized'); 
        }
        else {

            var delta = 0;
            var upvotedHints = Meteor.user().profile['upvotedHints'];
            console.log('upvotedHints', upvotedHints)
            //console.log('Meteor.user()',Meteor.user());
            //var siteUser = user.user; //SiteUsers.findOne({ userId: Meteor.userId() });
            

            logObj = {};

            if (!upvoted(hintId)) {
                console.log('upvote this hint:',hintId)
                delta = 1;
                logObj['action'] = 'upvote';
                //Meteor.user().profile['upvotedHints'].push(hintId);
                var updated_upvotedHints = upvotedHints.concat(hintId);
                console.log('upvotedHints update', updated_upvotedHints)
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": updated_upvotedHints }} );
                console.log('new user profile',Meteor.user().profile)
            } else {
                console.log('downvote this hint:',hintId)
                delta = -1;
                logObj['action'] = 'downvote';
                //Meteor.user().profile['upvotedHints'] = _.without(upvotedHints,hintId);
                Meteor.users.update( { _id: Meteor.userId() }, { $set: { "profile.upvotedHints": _.without(upvotedHints,hintId) }} );
                
                console.log('new user profile',Meteor.user().profile)
            }
            //Hints.update({ _id: hintId },{$inc: {upvotes: delta}});
            Hints.update({ _id: hintId },{$inc: {upvotes: delta}},function(err){
                if (err) {console.log('problem updating hint upvotes')} 
                else {
                    //logThis(classtitle,action,hintId)
                    logObj['owner'] = Meteor.userId();
                    //logObj['username'] = Meteor.user().username;
                    logObj['object'] = hintId;
                    logObj['createdAt'] = new Date();
                    logObj['class'] = theclass;
                    Log.insert(logObj);
                }
            });

            
        }
    },
    'loginAsEdxStudent': function(edxstudentID,source) {
        console.log(edxstudentID,source)
        //console.log('params',params)
        //var edxstudentID = params.query.student_id;
        //var source = params.query.source;
        console.log('edxstudentID,source',edxstudentID,source)

        var admin = false;
        //Session.set('admin',false);
        //if (edxstudentID==admin_user_urlsafe) {
        //['a', 'b', 'c'].indexOf(str) >= 0
        if (admin_user_urlsafe.indexOf(edxstudentID)>=0) { 
            admin = true;
            //Session.set('admin',true);
        }

        if (source=='berkeley') {
            try {
                var email = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(edxstudentID));
                //var email = atob(edxstudentID);
            } catch(err) {
                console.log(err,'no extracted email')
                var email = '';
            }     
        } else {
            var email = '';
        }

        var user = Accounts.findUserByUsername(edxstudentID);
        console.log('found user',user)
        
        console.log(email,'email',user,'user')
        if (!user) {
            Accounts.createUser({
                username: edxstudentID,
                password: edxpass,
                profile:{
                    'isEdxUser':true,
                    email: email,
                    source: source,
                    admin: admin
                }
            });
        }
        return {username: edxstudentID, password:edxpass}
    },
    // 'loginAsBerkeleyStudent': function(studentID) {
    //     //var edxUserName = 'edx'+edxstudentID;
    //     var admin = false;
    //     Session.set('admin',false);
    //     if (studentID==admin_user_urlsafe) {
    //         admin = true;
    //         Session.set('admin',true);
    //     }
    //     var username = atob(studentID);
    //     var user = Accounts.findUserByUsername(username);
    //     if (!user) {
    //         Accounts.createUser({
    //             username: username,
    //             email: username,
    //             password: edxpass,
    //             profile:{
    //                 'isBerkUser':true,
    //                 'studentID': studentID,
    //                 'admin': admin
    //                 }
    //         });
    //     }
    //     return {username: username, password:edxpass}
    // },
    // 'isAdmin': function(username){
    //     //var username = atob(studentID);
    //     try {
    //         var user = Accounts.findUserByUsername(username);
    //         //test this!
    //         console.log('user.profile',user.profile)
    //         console.log(username,admin_user_urlsafe)
    //         console.log(username == admin_user_urlsafe)
    //         return username == admin_user_urlsafe
    //     } catch(err) {
    //         console.log('err',err)
    //         return false
    //     }
    // },
    deleteError: function(username,errorId){
        try {
            var user = Accounts.findUserByUsername(username);
            //test this!
            console.log('user.profile',user.profile)
            console.log(username,admin_user_urlsafe)
            console.log(username == admin_user_urlsafe)
            if (username == admin_user_urlsafe) {
                Errors.remove(errorId);
            }
        } catch(err) {
            console.log('err',err)
            return false
        }
        
    },
    deleteHint: function(username,hintId){
        try {
            var user = Accounts.findUserByUsername(username);
            //test this!
            console.log('user.profile',user.profile)
            console.log(username,admin_user_urlsafe)
            console.log(username == admin_user_urlsafe)
            if (username == admin_user_urlsafe) {
                Hints.remove(hintId);
            }
        } catch(err) {
            console.log('err',err)
            return false
        }
        
    },
    logBtnClick: function(btnName){
        Log.insert({'owner': Meteor.userId(), 'clicked':btnName, 'dateAndTime': new Date()})
    }
});

Accounts.onLogin(function(user){
    console.log('logged in',user.user._id )
    Log.insert({'userId': user.user._id, 'loggedInAt': new Date()})
});

/*Accounts.onLoginFailure(function(){
    //console.log(Meteor.userId())
    Log.insert({'loggedInFailedAt': new Date()})
});*/

Accounts.onCreateUser(function(options, user) {
    console.log('creating user')
    
    if (options.profile) {
        user.profile = options.profile;
    } else {
        user.profile = {};
    }

    user.profile.upvotedHints = []; 
    user.profile.requestedErrors = [];

    console.log('user',user);

    return user;
});

Meteor.startup(function () {
        // var Base64test = 'am9zaEBqb3NoaC51Zw==';
        // var wordsObj = CryptoJS.enc.Base64.parse(Base64test);
        // console.log('crypto',CryptoJS.enc.Utf8.stringify(wordsObj))
        //console.log('example',CryptoJS.enc.Base64.parse(CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse('josh@joshh.ug'))))
        // code to run on server at startup
        //if (! Classes.findOne()){
        base_url = 'http://www.classoverflow.org/class/';

        Classes.remove({});
        var classes = [
            {
                classtitle: '6.004',
                errorCoords: [
                    {
                        name: "lab",
                        placeholder: 'Lab Number',
                        inputType: 'int'
                    },
                    {
                        name: "module",
                        placeholder: 'Module',
                        inputType: 'string'
                    },
                    {
                        name: "testNum",
                        placeholder: 'Test Number',
                        inputType: 'int'
                    }
    ],
                route: '/class/6.004'
            },
            {
                classtitle: '6.005',
                errorCoords: [
                    {
                        name: "ps",
                        placeholder: "Problem Set",
                        inputType: 'int'
                    },
                    {
                        name: "file",
                        placeholder: 'File Name',
                        inputType: 'string'
                    },
                    {
                        name: "line",
                        placeholder: 'Line Number',
                        inputType: 'int'
                    }
    ],
                route: '/class/6.005'
            },
            {
                classtitle: '61b',
                errorCoords: [
                    {
                        name: "branch",
                        placeholder: "Branch",
                        inputType: 'string'
                    },
                    {
                        name: "testgroup",
                        placeholder: 'Test Group',
                        inputType: 'string'
                    },
                    {
                        name: "testnum",
                        placeholder: 'Test Number',
                        inputType: 'int'
                    }
    ],
                route: '/class/61b'
            }
           ];
        classes.forEach(function (c) {
                Classes.insert(c);
            })
            //}
    });