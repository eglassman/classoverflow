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
    
}); 


//ADD NOTFIRST ATTRIBUTES
//logic based on code here:
//http://stackoverflow.com/questions/28663936/looking-at-previous-item-in-handlebars-loop-meteorjs
function add_not_firsts(my_collection,classtitle){
    var coord1 = 'ps';
    var coord2 = 'file';
    var coord3 = 'line'
    if (classtitle==='6.005'){
        var my_fetched_collection = my_collection.find({},{sort: {ps:1,file:1,line:1}}).fetch()
    }
    var previous_item = {}
    return _.map(my_fetched_collection, function(current_item) {
        // add an isAwesome property based on the previous kitten
        if (previous_item[coord1] === current_item[coord1]){
            current_item.coord1_notfirst = true;
            if (previous_item[coord2] === current_item[coord2]){
                current_item.coord2_notfirst = true;
                if (previous_item[coord3] === current_item[coord3]){
                    current_item.coord3_notfirst = true;
                }
            }
        }
        previous_item = current_item;
        return current_item
    });
}


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
        if (!Meteor.user() && this.params.query.student_id) {
            loginAsEdxStudent(this.params.query.student_id);
        }
        this.render();
    }
});

Router.route('/class/:classtitle',{
    template: 'classpage',
    subscriptions: function() {
        this.subscribe('classes').wait();
        this.subscribe('errors',this.params.classtitle).wait();
        this.subscribe('hints',this.params.classtitle).wait();
    },
    data: function () {
        var classtitle = this.params.classtitle;
        if (classtitle==='6.005') {
            return {'classtitle': classtitle,
                    'level': 1,
                    'errors': add_not_firsts(Errors,classtitle)} //Errors.find({},{sort: {ps:1,file:1,line:1}}).fetch()}//.sort({'ps':1})}
        }else if (classtitle==='6.004'){
            return {'classtitle': classtitle,
                    'level': 1,
                    'errors': Errors.find({},{sort: {lab:1,module:1,testNum:1}}).fetch()}
        }
    },
    action: function () {
        if (!Meteor.user() && this.params.query.student_id) {
            loginAsEdxStudent(this.params.query.student_id);
        }
        this.render();
    }
});

Router.route('/class/:classtitle/assignment/:assignment',{
    template: 'classpage',
    subscriptions: function() {
        this.subscribe('classes').wait();
        this.subscribe('errors',this.params.classtitle).wait();
        this.subscribe('hints',this.params.classtitle).wait();
    },
    data: function () {
        var classtitle = this.params.classtitle;
        var assignment = this.params.assignment;
        if (classtitle==='6.005') {
            return {'classtitle': classtitle,
                    'assignment': assignment,
                    'level': 2,
                    'errors': Errors.find({ps:parseInt(this.params.assignment)},{sort: {ps:1,file:1,line:1}}).fetch()}//.sort({'ps':1})}
        }else if (classtitle==='6.004'){
            return {'classtitle': classtitle,
                    'assignment': assignment,
                    'level': 2,
                    'errors': Errors.find({lab:parseInt(this.params.assignment)},{sort: {lab:1,module:1,testNum:1}}).fetch()}
        }
    },
    action: function () {
        if (!Meteor.user() && this.params.query.student_id) {
            loginAsEdxStudent(this.params.query.student_id);
        }
        this.render();
    }
});

Router.route('/class/:classtitle/assignment/:assignment/testgroup/:testgroup',{
    template: 'classpage',
    subscriptions: function() {
        this.subscribe('classes').wait();
        this.subscribe('errors',this.params.classtitle).wait();
        this.subscribe('hints',this.params.classtitle).wait();
    },
    data: function () {
        var classtitle = this.params.classtitle;
        var assignment = this.params.assignment;
        var testgroup = this.params.testgroup;
        if (classtitle==='6.005') {
            return {'classtitle': classtitle,
                    'assignment': assignment,
                    'testgroup': testgroup,
                    'level': 3,
                    'errors': Errors.find({ps:parseInt(assignment),file:testgroup},{sort: {ps:1,file:1,line:1}}).fetch()}//.sort({'ps':1})}
        } else if (classtitle==='6.004'){
            return {'classtitle': classtitle,
                    'assignment': assignment,
                    'testgroup': testgroup,
                    'level': 3,
                    'errors': Errors.find({lab:parseInt(assignment),module:testgroup},{sort: {lab:1,module:1,testNum:1}}).fetch()}
        }
    },
    action: function () {
        if (!Meteor.user() && this.params.query.student_id) {
            loginAsEdxStudent(this.params.query.student_id);
        }
        this.render();
    }
});


Accounts.ui.config({
    passwordSignupFields: 'EMAIL_ONLY', //"USERNAME_ONLY" restrictCreationByEmailDomain: 'school.edu',
    forceEmailLowercase: true
});
Template.registerHelper('certAuthEnabled',function(){
    return Session.get('certAuthEnabled');
});
Template.registerHelper('log',function(){
    console.log(this);
});
Template.registerHelper('accessProperty',function(dataObj,prop){
    return {assignmentkey_value: dataObj[prop]}
});

Template.registerHelper('is6005',function(classtitle){
    return classtitle=='6.005'
});
Template.registerHelper('is6004',function(classtitle){
    return classtitle=='6.004'
});
Template.registerHelper('is61b',function(classtitle){
    return classtitle=='61b'
});

Template.registerHelper('class_info',function(classtitle){
    return Classes.findOne({'classtitle':classtitle});
});

Template.registerHelper('islevel',function(level,levelnumber){
    return level==levelnumber
});

Template.registerHelper('hints',function(error_id){
    return Hints.find({errorId:error_id}, {sort: {upvotes: -1, _id: 1}}).fetch();
});

Template.hint.events({
    "click .upvote": function(event){

        if (Meteor.userId()) {
            var hintId = this._id;
            Meteor.call('toggleUpvote',Session.get('class'),hintId);
        } else {
            //alert('Please sign in so you can upvote this hint.');
            $('#mySignInModal').modal('show');
        }
        return false;
    }
});
Template.error_row_tds.events({
    "click .follow": function(event){

        if (Meteor.userId()) {
            var hintId = this._id;
            Meteor.call('toggleFollow',Session.get('class'),hintId);
        } else {
            //alert('Please sign in so you can upvote this hint.');
            $('#mySignInModal').modal('show');
        }
        return false;
    }
});


