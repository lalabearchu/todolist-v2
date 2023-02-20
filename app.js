//jshint esversion:6

const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

// Connect to database
mongoose.set("strictQuery", false);
mongoose.connect("mongodb+srv://lalabearchu:test123@cluster0.g3iw9uc.mongodb.net/todolistDB", { useNewUrlParser: true });

// Create item schema
const itemsSchema = new mongoose.Schema ({
  name: String
});

// Create item model
const Item = mongoose.model("Item", itemsSchema);

// Create default item document
const item1 = new Item ({
  name: "Hello"
});

const item2 = new Item ({
  name: "World"
});

const item3 = new Item ({
  name: "Vola"
});

const defaultItems = [item1, item2, item3];

// Create list schema
const listSchema = new mongoose.Schema ({
  name: String,
  // Have an array of docuemnts associated with itemSchema
  items: [itemsSchema]
});

// Create list model
const List = mongoose.model("List", listSchema);

// Root route get request
app.get("/", function(req, res) {

  // list all the documents
  Item.find({}, (err, results) => {
    // if there are no items, insert default items, then redirect to root route
    if (results.length === 0) {
      // Insert default items
      Item.insertMany(defaultItems, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved defaultItems into database.");
        }
      });
      // Redirect to root route
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "Today", newListItems: results});
    }
  });
});

// Add custom list route 
app.get("/:customListName", (req, res) => {

  const customListName = _.capitalize(req.params.customListName);

  // Check if the list already exists
  List.findOne({name: customListName}, (err, results) => {
    if (!err) {
      if (!results) {
        // Create a new list
        const list = new List ({
          name: customListName,
          items: defaultItems
        });
        // Save the list to list collection
        list.save();
        // Redirect to current route
        res.redirect("/" + customListName);
      } else {
        // Show existing list
        res.render("list", {listTitle: results.name, newListItems: results.items});
      }
    }
  })
})

// Save new item to database 
app.post("/", function(req, res){

  // Create item name variable
  const itemName = req.body.newItem;
  // Create list name variable
  const listName = req.body.list;
  // Create a new item document
  const item = new Item ({
    name: itemName
  });

  // Check which list the item came from
  if (listName === "Today") {
    // Save the item to item collection
    item.save();
    // Redirect to root route
    res.redirect("/");
  } else {
    // Find the custom list
    List.findOne({name: listName}, (err, results) => {
      // Add the item to custom list
      results.items.push(item);
      // Save the item to custom list collection
      results.save();
      // Redirect to custom list route
      res.redirect("/" + listName);
    })
  }

});

// Add delete route
app.post("/delete", (req, res) => {

  const checkedItemID = req.body.checkbox;
  const listName = req.body.listName;

  // Check which list to delete item from
  if (listName === "Today") {
    // Delete the checked item
    Item.findByIdAndRemove(checkedItemID, (err) => {
      if (!err) {
        console.log("Item deleted.");
        res.redirect("/");
      }
    });
  } else {
    // Delete the item from custom list using $pull
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemID}}}, (err, results) => {
      if (!err) {
        res.redirect("/" + listName);
      }
    });
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
