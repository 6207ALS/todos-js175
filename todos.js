const express = require("express");
const morgan = require("morgan");
const { body, validationResult } = require("express-validator");
const flash = require("express-flash");
const session = require("express-session");
const TodoList = require("./lib/todolist");

const app = express();
const HOST = "localhost";
const PORT = 3000;

// Static data for initial testing
let todoLists = require("./lib/seed-data");

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  name: "launch-school-todos-session-id",
  resave: false,
  saveUnitialized: true,
  secret: "this is not very secret",
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});


// return the list of todo lists sorted by completion status and title
const sortTodoLists = lists => {
  const sortByTitle = list => {
    return list.slice().sort((todoListA, todoListB) => {
      let titleA = todoListA.title.toLowerCase();
      let titleB = todoListB.title.toLowerCase();
  
      if (titleA < titleB) {
        return -1;
      } else if (titleA > titleB) {
        return 1;
      } else return 0;
    });
  }

  let doneLists = sortByTitle(lists.filter(todoList => todoList.isDone()));
  let notDoneLists = sortByTitle(lists.filter(todoList => !todoList.isDone())); 

  return [...notDoneLists, ...doneLists];
};

app.get("/", (req, res) => {
  res.redirect("/lists");
});

app.get("/lists/new", (req, res) => {
  res.render("new-list");
})

app.get("/lists", (req, res) => {
  res.render("lists", {
    todoLists: sortTodoLists(todoLists),
  });
});

app.post("/lists",
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The list title is required")
      .bail()
      .isLength({ max: 100 })
      .withMessage("List title must be between 1 and 100 characters")
      .custom(title => {
        let duplicate = todoLists.find(list => list.title === title);
        return duplicate === undefined;
      })
      .withMessage("List title must be unique"),
  ],
  (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("new-list", {
        flash: req.flash(),
        todoListTitle: req.body.todoListTitle,
      });
    } else {
      todoLists.push(new TodoList(req.body.todoListTitle));
      req.flash("success", "The todo list has been created");
      res.redirect("/lists");
    }
  },
);

// Listener
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT} of ${HOST}...`);
})