import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

import { validate as isUUID } from 'uuid';

@Injectable()
export class ProductsService {

    private readonly logger = new Logger('ProductService')

    constructor(
        @InjectRepository( Product )
        private readonly productRepository: Repository<Product>
    ){
    }

    async create(createProductDto: CreateProductDto) {
        
        try{

            const producto = this.productRepository.create( createProductDto );

            await this.productRepository.save( producto );

            return producto;

        }catch(error){

            this.handleDBExceptions( error )
        }
        
    }

    async findAll( paginationDto: PaginationDto ) {

        const { limit = 10, offset = 0 } = paginationDto;

        return await this.productRepository.find({
            take: limit,
            skip: offset

            // TODO: relaciones
        });

    }

    async findOne( term: string ) {

        let product: Product;

        if( isUUID( term ) ){
            product = await this.productRepository.findOneBy({ id: term })
        }else{

            // Buscar por titulo, id y slug
            
            const queryBuilder = this.productRepository.createQueryBuilder();

            product = await queryBuilder
                .where('UPPER(title) =:title or slug =:slug', {
                    title: term.toUpperCase(),
                    slug: term.toLowerCase()
                }).getOne();
        }

        if( !product ){
            throw new NotFoundException( 'Producto no encontrado con ese termino' )
        }

        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto) {

        const product = await this.productRepository.preload({
            id: id,
            ...updateProductDto
        });

        if( !product )
            throw new NotFoundException('Producto no encontrado.')

        try {

            return await this.productRepository.save( product )

        } catch (error) {
            this.handleDBExceptions( error )
        }
    }

    async remove(id: string ) {

        return await this.productRepository.delete( id );
        
    }


    private handleDBExceptions( error: any ){

        if( error.code === '23505' )
            throw new BadRequestException( error.detail )

        this.logger.error( error )
        throw new InternalServerErrorException('Unexpected error, check server logs')
    }
}
