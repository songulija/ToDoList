
const express = require('express');//have to require express to use it
const bodyParser = require('body-parser');//have to require to use it
const mongoose = require('mongoose');//require mongoose to use it
const _ = require('lodash');
var day = "";

const app = express();//this function represents express, bind it to const app
let items = ["Take shower","Make breakfast"];//we could add items

app.use(bodyParser.urlencoded({extended:true}));//everytime you use bodyParser you have this line
app.use(express.static("public"));//we specify location of our static files. which is
//public folder. to use css or js. we have to have it

app.set('view engine', 'ejs');//set view engine to use ejs

//specify how to connect to MongoDB and which database we want to create
//or connect to. We are conneting to url where our MongoDB
//is hosted which is mongodb://localhost:27017
mongoose.connect('mongodb+srv://admin-lukas:Test123@cluster0.rz3xq.mongodb.net/todolistDB?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true});
//we will connect to MongoDb atlas server. we will conenct to MongoDB cluster.
//to save our data in Cloud in mongoAtlas. replace everything other than last part where
//creating database todolistDB

//this schema scaffold out how we want data in particular collection to be structured
const itemsSchema = {//it will have field name which is type of string
  name: String
}

//So you write collection that you want to create
//We have to write singular form of collection,items singular form is Item
//It will pluralize it to items automatically. Second parameter is schema we are going to use
//to create items collection documents. By doing this it will create items collection if it
//doesnt exist. All documents inside collection will stick to itemsSchema
const Item = mongoose.model("Item", itemsSchema);
//giving singular form off collection it will pluralize it. and documents inside collection will stick to listSchema

//creating new document from Item model, creating it in items collection.
const item1 = new Item({
  name: 'Welcome to our todo'
});
const item2 = new Item({
  name: 'Have to clean dishes'
});
const item3 = new Item({
  name: 'Meet with Dany'
});

const defaultItems = [item1, item2, item3];//this array holds all 3 documents for items collection

const listSchema ={//so each list will have its own documents, we are creating schema for list
  name: String,
  items: [itemsSchema]//array of items schema based items. we created relationship
  //so list will have associated itemsSchema documents attached to it
}
const List = mongoose.model("List", listSchema);//creating collection (lists) if it doesnt exist

//when user goes to home route it triggers this callback function
app.get('/', function(req,res){
  let day = "Today";
  Item.find({},function(err, foundItems){//we call function find to find all documents in
    //items collection. leave first parametre (conditions) empty becouse we want to find all
    if(foundItems.length === 0){//if items collection was empty, no documents in it
      //then insert 3 default documents to items collection
      Item.insertMany(defaultItems, function(err){//item collection. and we insert array/many default documents
        if(err){
          console.log(err);
        }else{
          console.log('Succesfully inserted documents');
        }
        res.redirect('/');//redirect to home directory. so now that we have inserted items
        //it will able to get them
      });

    }else{
      //render list.ejs file. express will look views folder and for that file in it.
      //passing javascript object, passing key and value.  we pass marker var kindOfDay that
      //day value.
      //console.log(itemsListFromDB.task);
      res.render("list",{listName:day, newListItems:foundItems});
    }
  });
});

//creating custom list route. its dynamic route. its what goes after. localhost:3000/...
//so when user goes to that custom route it triggers this callback function
app.get("/:customListName", function(req,res){
  //get that parameter through request parameters
  const customListName = _.capitalize(req.params.customListName);
  //we have to check if there is already document with that customListName in lists collection
  List.findOne({name: customListName}, function(err, foundList){
    if(!err){//if there is no err
      if(!foundList){//if document found list doesnt exist
        //then add new document to lists collection
        const list = new List({//creating new list document out of List model
          name: customListName,//name of list is what user typed
          items: defaultItems//and adding default items to custom list
        });
        list.save();//List basically represents lists collection. we call save method to save
        //new document
        //redirect back to /:customListName" after adding new document to collection lists
        res.redirect('/' + customListName);
      }else{//if found list exist
        res.render("list",{listName:customListName, newListItems:foundList.items});
        //render list.ejs, and providing values for marker varuables in list.ejs
        //passing customListName, and foundList array of documents(items)
      }
    }
  });
});


//handle post request that comes to home route. When it happens trigger this callback function
app.post('/',function(req,res){
  const itemName = req.body.newItem;//we can tap into any route and you can tap into request body.
  const listName = req.body.button;
  //creating new document out of Item model.
  const item = new Item({
    name: itemName
  });
  //check if it was posted in default or custom list
  if(listName==="Today"){//if its default list then
    //insert item to items collection
    item.save();//save is shortcut that will save our new document to items collection. like insert
    res.redirect('/');//redirect to home route, there it will get items from db and display them
  }else{//if it is custom list then
    //find document in lists collection. model List basically represents collection lists
    List.findOne({name: listName}, function(err, foundList){
    //find document where name is equal to listName. callback return error and foundList if it was found
      if(err){//if there was no error
        console.log(err);
      }else{
        foundList.items.push(item);//then push new item to foundList items array
        foundList.save();//save that change(insert)
        res.redirect('/'+listName);//redirect back to / + listname
      }
    });
  }
});

//handle post request that comes to delete route. when it happens it triggers this callback function
app.post('/delete', function(req,res){
  //to delete from custom list we need that list(document) name from which we want to delete.
  //and item_id to know which item from what list(document) to delete
  const listName = req.body.listName;
  const itemId = req.body.checkbox;//checkbox value is item id
  //have to check which list it is
  if(listName==="Today"){//if its default list
    //delete document from items collection with that id
    Item.deleteOne({_id: itemId},function(err,result){//delete document where id is equal to itemId
      //then it will trigger callback which gives error and result
      if(err){
        console.log(err);
      }else{
        console.log("Succesfully deleted item document");
        res.redirect("/");//redirect to home route. it will get items from db and display them
      }
    });
  }else{//if it's customList
    //find that document in lists collection. and from array items delete that particular item
    //with that id. We just can pull item from array
    List.findOneAndUpdate(
      {name: listName},//find document in lists collection where its name equal to listName. its just filter
      {$pull: {items:{_id:itemId}}},//specify something we want to pull from. pull from array items
      function(err,foundList){
        if(!err){//if we deleted it without erors then just redirect back
          res.redirect('/'+listName);
          console.log("Succesfully deleted item document");
        }
      }



    )


  }

});

//listen to port 3000 for any HTTP request. Basically creating server on port 3000
app.listen(3000, function(){//when going to port 3000 it triggers this function
  console.log('Server is running on port 3000');
});
