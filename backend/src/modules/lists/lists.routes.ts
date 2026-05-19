import { Router } from 'express';
import * as controller from './lists.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { ReorderItemsSchema } from './lists.validator.js';

export const listsRouter = Router();


listsRouter.get('/popular', controller.popularListsHandler);


listsRouter.get('/:id', controller.getListDetailHandler);


listsRouter.patch(
  '/:id/items/reorder',
  requireAuth,
  validate(ReorderItemsSchema),
  controller.reorderListItemsHandler,
);


listsRouter.post('/:id/like', requireAuth, controller.toggleListLikeHandler);


listsRouter.delete('/:id/like', requireAuth, controller.toggleListLikeHandler);
