import { Schema, model } from 'mongoose';

const todoSchema = new Schema(
  {
    title: String,
    completed: Boolean,
  },
  {
    timestamps: true,
  },
);

const Todo = model('Todo', todoSchema);
export default Todo;
