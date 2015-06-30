
import chalk from 'chalk'

/**
 * Loglevel enum
 */
export const LOGLEVELS = {
    silly: 0,
    verbose: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5
}

// Private write function symbol for Logger
var write = Symbol( 'write' )

// Default log option hash
var logOpts = {
    loglevel: LOGLEVELS.info,
    title: '  [hulk]',
    suppressed: false
}

/**
 * @class Logger
 * @description Friendly wrapper around console log
 */
export class Logger {
    constructor( opts ) {
        let options = Object.assign( logOpts, opts )

        // Dirty copy opts to class
        for ( let [ key, value ] of Object.entries( options ) ) {
            if ( !this[ key ] ) {
                this[ key ] = value
            }
        }

        // Add private write function
        this[ write ] = function() {
            if ( this.suppressed ) {
                return
            }

            console.log( chalk.grey( this.title ), ...arguments )
        }.bind( this )
    }

    /**
     * Returns a bound method to allow shorthand calling
     * e.g. this.log instead of this.logger.log
     */
    shorthand( method ) {
        if ( !this[ method ] ) {
            throw new Error( 'Attempting to access unknown Logger method' )
        }

        return this[ method ].bind( this )
    }

    /**
     * Equivalent to info level logs
     */
    log() {
        if ( this.loglevel > LOGLEVELS.info ) {
            return
        }

        this[ write ]( ...arguments )
    }

    /**
     * Verbose logging
     */
    verbose() {
        if ( this.loglevel > LOGLEVELS.verbose ) {
            return
        }

        console.log( chalk.blue( this.title ), ...arguments )
    }

    /**
     * Error happening here
     */
    error() {
        console.log( chalk.red( this.title + ' ERROR' ), ...[].map.call( arguments, arg => chalk.red( arg ) ) )
    }
}
