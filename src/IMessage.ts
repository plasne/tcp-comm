export default interface IMessage {
    i?: number; // messageId for receipt
    c: string; // command
    p?: any; // payload
    e?: number; // is encoded?
}
