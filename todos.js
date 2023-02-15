const express = require("express");
const morgan = require("morgan");
const { body, validationResult } = require("express-validator");
const flash = require("express-flash");
const session = require("express-session");
const TodoList = require("./lib/todolist");
const { sortTodoLists, sortTodos } = require("./lib/sort");

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
  saveUninitialized: true,
  secret: "this is not very secret",
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

// Find a todo list with the indicated ID. Returns `undefined` if not found.
// Note that `todoListId` must be numeric.
const loadTodoList = todoListId => {
  return todoLists.find(todoList => todoList.id === todoListId);
};

const loadTodo = (todoListId, todoId) => {
  let todoList = loadTodoList(todoListId);
  if (!todoList) return undefined;

  return todoList.todos.find(todo => todo.id === todoId);
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

// Render individual todo list and its todos
app.get("/lists/:todoListId", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(Number(todoListId));

  if (todoList === undefined) {
    next(new Error(`List ${listId} not found.`));
  } else {
    res.render("list", {
      todoList: todoList,
      todos: sortTodos(todoList),
    });
  }
});

app.post("/lists/:todoListId/todos/:todoId/toggle", (req, res, next) => {
  let { todoListId, todoId } = { ...req.params };
  let todo = loadTodo(Number(todoListId), Number(todoId));

  if (!todo) {
    next(new Error("Not found"));
  } else {
    let title = todo.title;
    if (todo.isDone()) {
      todo.markUndone();
      req.flash("success", `"${title}" marked incomplete!`);
    } else {
      todo.markDone();
      req.flash("success", `"${title}" marked complete!`);
    }
  }

  res.redirect(`/lists/${todoListId}`);
});

app.post("/lists/:todoListId/todos/:todoId/destroy", (req, res, next) => {
  let { todoListId, todoId } = { ...req.params };
  let todoList = loadTodoList(Number(todoListId));
  let todo = loadTodo(Number(todoListId), Number(todoId));

  if (!todoList || !todo) {
    next(new Error("Not Found"));
  } else {
    let title = todo.title;
    todoList.removeAt(todoList.findIndexOf(todo));
    req.flash("success", `Removed "${title}!"`);
    res.redirect(`/lists/${todoListId}`);
  }
});

app.post("/lists/:todoListId/complete_all", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(Number(todoListId));

  if (!todoList) {
    next(new Error("Not Found"));
  } else {
    todoList.markAllDone();
    req.flash("success", "Marked all tasks complete!");
    res.redirect(`/lists/${todoListId}`);
  }
}); 

// Error Handler
app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

// Listener
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT} of ${HOST}...`);
})