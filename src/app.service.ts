import { readFileSync } from 'fs';
import { Injectable, Module } from '@nestjs/common';
import { GraphQLSchema } from 'graphql';
import { sync as globSync } from 'glob';
import { ModelService } from './graphql/model.service';

@Injectable()
@Module({
  providers: [ModelService],
})
export class AppService {
  constructor(private readonly modelService: ModelService) {}

  private loadTypes(pattern: string): string[] {
    const paths = globSync(pattern);
    return paths.map(path => readFileSync(path, 'utf8'));
  }

  getSchema(): GraphQLSchema {
    const string = this.loadTypes('./**/*.graphql').join('\n');
    if (string === '') {
      throw new Error('No GraphQL schema files found (*.grpahql)');
    }
    const modelSchema = this.modelService.parseModelSchema(string);
    return this.modelService.getGraphQLSchema(modelSchema);
  }
}
