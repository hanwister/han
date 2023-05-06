import { ApolloServer } from 'apollo-server';
import Build_GraphQl from "./dudu-graphql";
import { createId } from '@paralleldrive/cuid2';
import * as fs from 'fs';

import Build_Rabbit from "./dudu-rabbit";
import EventEmitter from "events";

const Emitter = new EventEmitter();

async function main() {
        try {
            const config = JSON.parse(fs.readFileSync(`${__dirname}/../configs/config.json`).toString());
     
            const Rabbit = new Build_Rabbit(config.AMQP_URL);
            Rabbit.connect().then( async ()=> {
                await Rabbit.createChannel()
            }).then(async ()=>{
                await Rabbit.channel.prefetch(10)
                let { queue } = await Rabbit.assertQueue('', { exclusive: true});
    
                const QueueMap = new Map(["get", "list", "create", "update"].map( (act) => [act, `${config.id}-${act}`]))
                QueueMap.forEach(async value => {
                    await Rabbit.assertQueue(value, {durable: true})
                });
    
                await Rabbit.consume( queue, async (request) => {
                    Emitter.emit(request.properties.messageId, JSON.parse(request.content));
                }, { noAck: true});
    
                let sendAndListenQueue = async ( type, data ) => {
                    let _id = createId();
                    await Rabbit.send( QueueMap.get(type), Buffer.from(JSON.stringify( data)), {
                        replyTo: queue,
                        messageId: _id,
                        persistent: true
                    });
                    return new Promise( (resolve, reject) => {
                        Emitter.once( _id, ({ success, data}) => {
                            if (success) {
                                resolve(data)
                            } else {
                                reject(data)
                            }
                        })
                    })
                };
    
                const Graphql = new Build_GraphQl(config.tables);
                Graphql.setQueue(sendAndListenQueue);
                console.log(Graphql.generateTypeDefs())
                
                const server = new ApolloServer({ 
                    typeDefs: Graphql.generateTypeDefs(),
                    resolvers: Graphql.generateResolves()
                });
                await server.listen(config.GRAPHQL_PORT).then(({ url }) => {
                    console.log(`Server ready at ${url}`);
                });
            });
        } catch (err) {
            console.log(err.message)
        }
};

main();