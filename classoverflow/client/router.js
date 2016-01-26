
//Helper functions

loginRouter = function(params){
    console.log('loginRouter',params)
    if (params.query.student_id && !Meteor.user()){
        console.log('edxstudentID,source',params.query.student_id,params.query.source)
        //console.log(atob(params.query.source))
        loginAsEdxStudent(params.query.student_id,params.query.source);
    }
}

loginAsEdxStudent = function(edxstudentID,source) {
    Meteor.call('loginAsEdxStudent',edxstudentID,source, function(error,result){
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

// loginAsBerkeleyStudent = function(studentID) {
//     Meteor.call('loginAsBerkeleyStudent',studentID, function(error,result){
//         if (error) {
//             console.log('error on login as berkeley student',error);
//         } else {
//             Meteor.loginWithPassword(result.username,result.password,function(error){
//                 if (error) {
//                     console.log('error logging in with password',error);
//                 }
//             });
//         }

//     });
// }



//ADD NOTFIRST ATTRIBUTES
//logic based on code here:
//http://stackoverflow.com/questions/28663936/looking-at-previous-item-in-handlebars-loop-meteorjs
function add_not_firsts(my_collection,filterObj,sortObj,coordNames){
    var my_fetched_collection = my_collection.find(filterObj,{sort: sortObj}).fetch()
    var previous_item = {}
    return _.map(my_fetched_collection, function(current_item) {
        // add an isAwesome property based on the previous kitten
        if (previous_item[coordNames[0]] === current_item[coordNames[0]]){
            current_item.coord0first = false;
            // current_item.coord1first = false;
            // current_item.coord2first = false;
            if (previous_item[coordNames[1]] === current_item[coordNames[1]]){
                current_item.coord1first = false;
                // current_item.coord2first = false;
                if (previous_item[coordNames[2]] === current_item[coordNames[2]]){
                    current_item.coord2first = false;
                } else {
                    current_item.coord2first = true;
                }
            } else {
                current_item.coord1first = true;
                current_item.coord2first = true;
            }
        } else {
            current_item.coord0first = true;
            current_item.coord1first = true;
            current_item.coord2first = true;
        }
        previous_item = current_item;
        return current_item
    });
}



Router.route('/',{
    template: 'mainpage',
    waitOn: function() {
        return Meteor.subscribe('classes');
    },
    data: function(){
        return {'class_entries': Classes.find().fetch().sort({classtitle:1}) }
    },
    action: function () {
        loginRouter(this.params);
        if (this.ready()) {
            this.render();
        }
    }
});


Router.route('/class/:classtitle',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    //template: 'classpage',
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        loginRouter(this.params)

        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};

        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
        }

        var dataObj = {
            'classtitle': classtitle,
            'level': 1,
            'errorCoords': errorCoords,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors};
            
        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});




Router.route('/class/:classtitle/:assignment',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);
        var assignment = decodeURIComponent(this.params.assignment);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        loginRouter(this.params)

        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};
        if (errorCoords[0]['inputType']==='int') {
            filterObj[errorCoords[0]['name']] = parseInt(assignment);
        } else if (errorCoords[0]['inputType']==='string') {
            filterObj[errorCoords[0]['name']] = assignment;
        } else {
            alert('unknown type in url');
        }
        
        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
        }

        var dataObj = {
            'classtitle': classtitle,
            'level': 2,
            'errorCoords': errorCoords,
            'assignment': assignment,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors};
            
        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});

Router.route('/class/:classtitle/:assignment/:testgroup',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);
        var assignment = decodeURIComponent(this.params.assignment);
        var testgroup = decodeURIComponent(this.params.testgroup);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        loginRouter(this.params)
        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};
        if (errorCoords[0]['inputType']==='int') {
            filterObj[errorCoords[0]['name']] = parseInt(assignment);
        } else if (errorCoords[0]['inputType']==='string') {
            filterObj[errorCoords[0]['name']] = assignment;
        } else {
            alert('unknown type in url');
        }
        if (errorCoords[1]['inputType']==='int') {
            filterObj[errorCoords[1]['name']] = parseInt(testgroup);
        } else if (errorCoords[1]['inputType']==='string') {
            filterObj[errorCoords[1]['name']] = testgroup;
        } else {
            alert('unknown type in url');
        }

        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
        }
        

        var dataObj = {
            'classtitle': classtitle,
            'level': 3,
            'errorCoords': errorCoords,
            'assignment': assignment,
            'testgroup': testgroup,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors};

        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});

Router.route('/class/:classtitle/:assignment/:testgroup/:testnum',{
    waitOn: function() {
        var classtitle = decodeURIComponent(this.params.classtitle);
        return [Meteor.subscribe('classes'),
                Meteor.subscribe('errors',classtitle),
                Meteor.subscribe('hints',classtitle)];
    },
    action: function () {

        var classtitle = decodeURIComponent(this.params.classtitle);
        var assignment = decodeURIComponent(this.params.assignment);
        var testgroup = decodeURIComponent(this.params.testgroup);
        var testnum = decodeURIComponent(this.params.testnum);

        var class_entry = Classes.findOne({
            classtitle: classtitle
        });
        Session.set('class', classtitle);
        Session.set('numErrorCoords',class_entry['errorCoords'].length);

        //find or login with student id
        loginRouter(this.params)
        Session.set('submitQ', false);
        
        var errorCoords = class_entry['errorCoords'];

        var sortObj = {};
        sortObj[errorCoords[0]['name']] = 1;
        sortObj[errorCoords[1]['name']] = 1;
        sortObj[errorCoords[2]['name']] = 1;

        var coordNames = [];
        coordNames.push(errorCoords[0]['name']);
        coordNames.push(errorCoords[1]['name']);
        coordNames.push(errorCoords[2]['name']);

        var filterObj = {};
        if (errorCoords[0]['inputType']==='int') {
            filterObj[errorCoords[0]['name']] = parseInt(assignment);
        } else if (errorCoords[0]['inputType']==='string') {
            filterObj[errorCoords[0]['name']] = assignment;
        } else {
            alert('unknown type in url');
        }
        if (errorCoords[1]['inputType']==='int') {
            filterObj[errorCoords[1]['name']] = parseInt(testgroup);
        } else if (errorCoords[1]['inputType']==='string') {
            filterObj[errorCoords[1]['name']] = testgroup;
        } else {
            alert('unknown type in url');
        }

        if (errorCoords[2]['inputType']==='int') {
            filterObj[errorCoords[2]['name']] = parseInt(testnum);
        } else if (errorCoords[2]['inputType']==='string') {
            filterObj[errorCoords[2]['name']] = testnum;
        } else {
            alert('unknown type in url');
        }

        var one_error = false;
        var num_errors = Errors.find(filterObj).count();
        if (num_errors===0) {
            var no_errors = true;
            var sorted_errors = add_not_firsts(Errors,{},sortObj,coordNames)
        } else {
            var no_errors = false;
            var sorted_errors = add_not_firsts(Errors,filterObj,sortObj,coordNames)
            if (num_errors===1) {
                var one_error = true;
                var all_errors = add_not_firsts(Errors,{},sortObj,coordNames)
            }
        }
        
        var dataObj = {
            'classtitle': classtitle,
            'level': 4,
            'errorCoords': errorCoords,
            'assignment': assignment,
            'testgroup': testgroup,
            'testnum': testnum,
            'sorted_errors': sorted_errors,
            'no_errors': no_errors,
            'one_error': one_error,
            'all_errors': all_errors};

        if (this.ready()) {
            this.render('classpage',{
                data: function(){
                    return dataObj
                }
            }); 
        }
    }
});