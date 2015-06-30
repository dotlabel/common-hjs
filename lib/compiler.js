
import fs from 'fs'
import path from 'path'

import chalk from 'chalk'
import hogan from 'hogan.js'
import glob from 'glob'
import hrtime from 'pretty-hrtime'

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

            let partials = files
                .filter( file => !file.match( /index\./ ) )
                .map( file => path.resolve( file ) )

            let layouts = files
                .filter( file => file.match( /index\./ ) )
                .map( file => path.resolve( file ) )

            // Grab each partial
            // Filter for not index files
            // Map to absolute files
            // Map to promises resolving the file contents
            Promise.all( partials.map( file => this.getPartial( file ) ) )
                // Map partials key:values into a single object
                .then( promises => {
                    return promises.reduce( ( prev, curr ) => {
                        Object.keys( curr ).forEach( key => {
                            if ( prev[ key ] ) {
                                this.error( 'Duplicate partial keys, use unique names' )
                                throw new Error( 'duplicate partial keys' )
                            }

                            // If the key is unique then copy onto the partials object
                            this.log( chalk.magenta( 'Adding partial' ), key )
                            prev[ key ] = curr[ key ]
                        })
                        return prev
                    }, {} )
                })
                // Render each layout, using the created partials object and context objects
                .then( partialObject => {
                    // For each layout render through the base template
                    return layouts.map( layout => {
                        this.log( chalk.yellow( 'rendering' ), this.bundledName( layout ) )

                        // Render the base, using the layout as a body and sending the
                        // other partials through, also send context in
                        let tmpl = this.base.render( this.context, Object.assign( partialObject, {
                            body: fs.readFileSync( path.resolve( layout ), { encoding: 'utf8' } )
                        }))

                        let output = {}
                        output[ layout ] = tmpl

                        return output
                    })
                })
                // Maps all rendered views through a file writer
                .then( views => {
                    // Map into promises
                    return Promise.all(
                        views.map( view => {
                            Object.keys( view ).map( key => {
                                return new Promise( ( resolve, reject ) => {
                                    let shortName = this.bundledName( key )
                                    this.log( chalk.green( 'writing' ), shortName )
                                    fs.writeFile( path.join( this.argv.o, shortName + '.html' ), view[ key ], writeErr => {
                                        if ( writeErr ) {
                                            this.error( 'Error writing view file', shortName )
                                            return reject( writeErr )
                                        }

                                        resolve()
                                    })
                                })
                            })
                        })
                    )
                })
                // Should get here when all those files get written
                .then( () => {
                    this.log( chalk.green( 'OK' ) )

                    this.verbose(
                        chalk.blue( '-' ),
                        'Compile time:',
                        chalk.magenta( hrtime( process.hrtime( startTime ) ) )
                    )
                })
                .catch( error => {
                    this.error( error )
                    this.error( error.stack )
                })
        })
    }
}
