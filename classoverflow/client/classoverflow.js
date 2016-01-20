//SUBSCRIBING TO COLLECTIONS SHARED BY SERVER
Classes = new Meteor.Collection("classes");
Errors = new Mongo.Collection("errors");
Hints = new Mongo.Collection("hints");

//LOGIN HELPER
loginAsEdxStudent = function(edxstudentID) {
    Meteor.call('loginAsEdxStudent',edxstudentID, function(error,result){
        if (error) {
            console.log('error on login as edx student',error);
        } else {
            Meteor.loginWithPassword(result.username,result.password,function(error){
                if (error) {
                    console.log('error logging in with password',error);
                }
            });
        }
    });
}

Meteor.startup(function () {
    //Deploy edX version without settings.json
    if (Meteor.settings.public.CertAuthURL) {
        CertAuth.login();
        Session.set('certAuthEnabled',true);
    }
    if (!Meteor.user() && this.params.query.student_id) {
        loginAsEdxStudent(this.params.query.student_id);
    }
}); 

//ROUTER CALLS
Router.route('/',{
    template: 'mainpage',
    subscriptions: function() {
        this.subscribe('classes').wait();
    },
    data: function(){
        return {'class_entries': Classes.find().fetch().sort({classtitle:1}) }
    },
    action: function () {
        this.render();
    }
});

Router.route('/class/:classtitle',{
    template: 'classpage',
    subscriptions: function() {
        this.subscribe('errors',this.params.classtitle).wait();
    },
    data: function () {
        var classtitle = this.params.classtitle;
        if (classtitle==='6.005') {
            return {'classtitle': classtitle,
                    'errors': Errors.find({},{sort: {ps:1,file:1,line:1}}).fetch()}//.sort({'ps':1})}
        }else if (classtitle==='6.004'){
            return {'classtitle': classtitle,
                    'errors': Errors.find({},{sort: {lab:1,module:1,testNum:1}}).fetch()}
        }
    },
    action: function () {
        this.render();
    }
});

Router.route('/class/:classtitle/assignment/:assignment',{
    template: 'classpage',
    subscriptions: function() {
        this.subscribe('errors',this.params.classtitle).wait();
    },
    data: function () {
        var classtitle = this.params.classtitle;
        if (classtitle==='6.005') {
            return {'classtitle': classtitle,
                    'errors': Errors.find({ps:parseInt(this.params.assignment)},{sort: {ps:1,file:1,line:1}}).fetch()}//.sort({'ps':1})}
        }else if (classtitle==='6.004'){
            return {'classtitle': classtitle,
                    'errors': Errors.find({lab:parseInt(this.params.assignment)},{sort: {lab:1,module:1,testNum:1}}).fetch()}
        }
    },
    action: function () {
        this.render();
    }
});

Router.route('/class/:classtitle/assignment/:assignment/testgroup/:testgroup',{
    template: 'classpage',
    subscriptions: function() {
        this.subscribe('errors',this.params.classtitle).wait();
    },
    data: function () {
        var classtitle = this.params.classtitle;
        var assignment = this.params.assignment;
        var testgroup = this.params.testgroup;
        if (classtitle==='6.005') {
            return {'classtitle': classtitle,
                    'assignment': assignment,
                    'testgroup': testgroup,
                    'errors': Errors.find({ps:parseInt(assignment),file:testgroup},{sort: {ps:1,file:1,line:1}}).fetch()}//.sort({'ps':1})}
        } else if (classtitle==='6.004'){
            return {'classtitle': classtitle,
                    'assignment': assignment,
                    'testgroup': testgroup,
                    'errors': Errors.find({lab:parseInt(assignment),module:testgroup},{sort: {lab:1,module:1,testNum:1}}).fetch()}
        }
    },
    action: function () {
        this.render();
    }
});


Accounts.ui.config({
    passwordSignupFields: 'EMAIL_ONLY', //"USERNAME_ONLY" restrictCreationByEmailDomain: 'school.edu',
    forceEmailLowercase: true
});

Template.registerHelper('is6005',function(classtitle){
    return classtitle=='6.005'
});
Template.registerHelper('is6004',function(classtitle){
    return classtitle=='6.004'
});
Template.registerHelper('certAuthEnabled',function(){
    return Session.get('certAuthEnabled');
});
