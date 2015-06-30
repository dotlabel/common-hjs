
import fs from 'fs'
import path from 'path'

import chalk from 'chalk'
import hogan from 'hogan.js'
import glob from 'glob'

import { Logger, LOGLEVELS } from './utils'


export default class Compiler {
    constructor( argv ) {

        this.argv = argv

        this.logger = new Logger({
            loglevel: this.argv.verbose ? LOGLEVELS.verbose : LOGLEVELS.info
        })
        this.log = this.logger.shorthand( 'log' )
        this.verbose = this.logger.shorthand( 'verbose' )
        this.error = this.logger.shorthand( 'error' )

        // Grab context
        try {
            this.context = JSON.parse( fs.readFileSync( path.resolve( this.argv.data ), { encoding: 'utf8' } ) )
        } catch( err ) {
            this.error( 'Error creating data context' )
            this.verbose( err )
            throw new Error( err )
        }

        // Grab base template
        try {
            this.base = hogan.compile( fs.readFileSync( path.resolve( this.argv.base ), { encoding: 'utf8' } ) )
        } catch( err ) {
            this.error( 'Error accessing base template' )
            this.verbose( err )
            throw new Error( err )
        }
    }

    /**
     * Works out the bundled name from the file path for index layouts
     */
    bundledName = ( filepath ) => {
        return path.dirname( filepath ).match( /[^\/]*$/ )[ 0 ]
    }

    /**
     * Promisified fs.readFile taht returns { partialName: partialContents }
     */
    getPartial = ( filepath ) => {
        return new Promise( ( resolve, reject ) => {
            fs.readFile( filepath, { encoding: 'utf8' }, ( err, file ) => {
                if ( err ) {
                    this.error( 'Error reading file', chalk.yellow( filepath ) )
                    return reject( err )
                }

                let output = {}
                output[ path.basename( filepath, '.hjs' ) ] = file
                resolve( output )
            })
        })
    }

    /**
     * Punts all found index.hjs's as the body to the base template using the context
     */
    compile = () => {
        let partialGlob = this.argv.partials
        this.verbose( 'Globbing for layouts', chalk.yellow( partialGlob ) )

        let startTime = process.hrtime()

        glob( partialGlob, ( err, files ) => {
            if ( err ) {
                this.error( 'Error globbing for partials and layouts' )
                this.verbose( err )
                throw new Error( err )
            }

            // Grab each partial
            // Filter for not index files
            // Map to absolute files
            // Map to promises resolving the file contents
            Promise.all( files
                .filter( file => !file.match( /index\./ ) )
                .map( file => path.resolve( file ) )
                .map( file => this.getPartial( file ) )
            )
                .then( partials => {
                    return partials.reduce( ( prev, curr ) => {
                        Object.keys( curr ).forEach( key => {
                            if ( prev[ key ] ) {
                                this.error( 'Duplicate partial keys, use unique names' )
                                throw new Error( 'duplicate partial keys' )
                            }

                            // If the key is unique then copy onto the partials object
                            this.verbose( 'Adding partial', chalk.magenta( key ) )
                            prev[ key ] = curr[ key ]
                        })
                        return prev
                    }, {} )
                })
                .then( partials => {
                    this.log( 'reduced', partials )
                })
                .catch( err => {
                    this.error( err )
                    this.error( err.stack )
                })

            // For each layout file
            // let layouts = files
            //     .map( file => path.resolve( file ) )
            //     .filter( file => file.match( /index\./ ))
            //     .forEach( file => {
            //
            //     })

        })
    }
}
