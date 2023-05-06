import * as amqplib from "amqplib";

class Build_Rabbit {
    amqp_url: string;
    amqp: any;
    channel: any;
    constructor(ampq_url) {
        this.amqp_url = ampq_url;
    };

    public async connect() {
        this.amqp = await amqplib.connect(this.amqp_url);
        return this.amqp;
    };

    public async createChannel(prefetch = 0) {
        this.channel = await this.amqp.createChannel();
        if ( prefetch) { this.channel.prefetch(prefetch)};
        return this.channel;
    };

    public async assertQueue( name, config:object = { durable: false}) {
        return await this.channel.assertQueue(...arguments);
    };

    public async asserExchange( name, type, config = { durable: false}) {
        return await this.channel.asserExchange(...arguments);
    };

    public async bind( queueName, exchangeName) {
        return await this.channel.bindQueue(...arguments, '');
    }

    public async consume( name, func, config = { noAck: false}) {
        return await this.channel.consume( ...arguments);
    };

    public async send( name, data, config) {
        return await this.channel.sendToQueue(...arguments);
    };

    public async public (nameExchange, queueName, data) {
        return await this.channel.publish(...arguments);
    };
};

export default Build_Rabbit;