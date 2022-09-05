/*
 * Created with @iobroker/create-adapter v2.2.0
 */

import * as utils from '@iobroker/adapter-core';
import axios from 'axios';


class Ecoflow extends utils.Adapter {

    private sn='';
    private apikey='';
    private secretkey='';
    private polltime=0;
    private adapterIntervals: any; //halten von allen Intervallen

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'ecoflow',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {

        //Püfen die übergabe da ist
        if(this.config.sn) {
            this.sn = this.config.sn;
        } else {
            this.log.error('No secretkey is set, adapter stop')
            return;
        }

        if(this.config.apikey) {
            this.apikey = this.config.apikey;
        } else {
            this.log.error('No apikey is set, adapter stop')
            return;
        }

        if(this.config.secretkey) {
            this.secretkey = this.config.secretkey;
        } else {
            this.log.error('No secretkey is set, adapter stop')
            return;
        }

        //Prüfen Polltime
        if(this.config.polltime > 0) {
            this.polltime = this.config.polltime;
        } else {
            this.log.error('Wrong Polltime (polltime < 0), adapter stop')
            return;
        }

        //holen für den Start einmal alle Daten
        this.getEcoflowData();


        //War alles ok, dann können wir die Daten abholen
        this.adapterIntervals = this.setInterval(() => this.getEcoflowData(), this.polltime * 1000);

    }

    private onUnload(callback: () => void): void {
        try {
            clearInterval(this.adapterIntervals);
            callback();
        } catch (e) {
            callback();
        }
    }

    private getEcoflowData(): void {
        this.log.debug('Ask Data from ecoflow cloud API');

        try {
            this.log.debug('call: ' + 'https://api.ecoflow.com/iot-service/open/api/device/queryDeviceQuota?sn=' + this.sn);
            axios('https://api.ecoflow.com/iot-service/open/api/device/queryDeviceQuota?sn='+ this.sn, {
                headers: {
                    'Content-Type': 'application/json',
                    'appKey': this.apikey,
                    'secretKey': this.secretkey
                }}).then( async response => {
                this.log.debug('Get-Data from ecoflow:' + JSON.stringify(response.data));

                //Global status Items
                await this.setStateAsync('status.soc', { val: response.data.data.soc, ack: true });
                await this.setStateAsync('status.remainTime', { val: response.data.data.remainTime, ack: true });
                await this.setStateAsync('status.wattsOutSum', { val: response.data.data.wattsOutSum, ack: true });
                await this.setStateAsync('status.wattsInSum', { val: response.data.data.wattsInSum, ack: true });

                this.setState('info.connection', true, true);
            }).catch(error => {
                this.log.error(error.message)
                this.setState('info.connection', false, true);
            });
        } catch (error: unknown) {
            this.setState('info.connection', false, true);
            if (typeof error === 'string') {
                this.log.error(error);
            } else if (error instanceof Error) {
                this.log.error(error.message);
            }
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Ecoflow(options);
} else {
    // otherwise start the instance directly
    (() => new Ecoflow())();
}

