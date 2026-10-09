import {http,HttpResponse} from 'msw';
export const handlers=[http.get('*/api/users/:userId/jobs',()=>HttpResponse.json([]))];
