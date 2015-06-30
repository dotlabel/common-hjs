
import chalk from 'chalk'

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
    }

    compile = () => {
        this.log( 'compiling' )
    }
}
