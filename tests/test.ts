// Copyright (c) 2022 System233
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { ABIRPC } from "..";


class ServerHander {
    say(message: string) {
        console.log('message from client:', message)
    }
    echo(message:string){
        console.log('echo:', message)
        return message;
    }
}
class ClientHander {
    test(message: string) {
        console.log('message from server :', message)
    }
}
let server:ABIRPC<ClientHander>;

const client = new ABIRPC<ServerHander>(x=>server.handle(x), new ClientHander);

server = new ABIRPC<ClientHander>(x=>client.handle(x), new ServerHander);
server.call('test', 'hello');
client.call('say', 'say message');
client.call('echo', 'echo message').then(x=>console.log('echo result',x));
