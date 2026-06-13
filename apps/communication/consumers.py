from channels.generic.websocket import AsyncWebsocketConsumer
import json


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous:
            await self.close()
        else:
            self.group_name = f'notifications_{self.user.id}'
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def notify(self, event):
        await self.send(text_data=json.dumps({
            'type': event['type'],
            'message': event['message'],
            'notification_type': event['notification_type'],
            'related_object_id': event.get('related_object_id'),
            'related_object_type': event.get('related_object_type'),
        }))
